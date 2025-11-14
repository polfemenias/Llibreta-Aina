import React, { useState, useEffect } from 'react';
import type { Presentation, GenerationProgress } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, SpinnerIcon, DownloadIcon } from './Icons';
import { exportPresentationToPdf } from '../services/pdfService';

interface SlideshowProps {
  presentation: Presentation;
  onClose: () => void;
  isGenerating?: boolean;
  generationProgress?: GenerationProgress | null;
}

const GenerationProgressIndicator: React.FC<{ progress: GenerationProgress }> = ({ progress }) => (
    <div className="slideshow-generation-progress">
        <SpinnerIcon className="spinner-small" />
        <div className="progress-text-container">
            <span className="progress-message">{progress.message}</span>
            <span className="progress-steps">Pas {progress.currentStep} de {progress.totalSteps}</span>
        </div>
    </div>
);


export const Slideshow: React.FC<SlideshowProps> = ({ presentation, onClose, isGenerating, generationProgress }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isTextVisible, setIsTextVisible] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { slides } = presentation;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [slides, onClose]);

  useEffect(() => {
    // Show text whenever a new slide appears
    setIsTextVisible(true);
  }, [currentIndex]);

  const handleExportPdf = async () => {
    if (isExportingPdf || isGenerating) return;
    
    setIsExportingPdf(true);
    try {
      await exportPresentationToPdf(presentation);
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("No s'ha pogut generar el PDF. Torna-ho a provar.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const goToPrevious = () => {
    const isFirstSlide = currentIndex === 0;
    const newIndex = isFirstSlide ? slides.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
  };

  const goToNext = () => {
    const isLastSlide = currentIndex === slides.length - 1;
    const newIndex = isLastSlide ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
  };

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) {
      return;
    }
    const currentTouch = e.changedTouches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > minSwipeDistance) {
      goToNext();
    } else if (diff < -minSwipeDistance) {
      goToPrevious();
    }
    setTouchStart(null);
  };
  
  // Special loading state for when content is being generated and no slides are available yet.
  if (isGenerating && (!slides || slides.length === 0)) {
    return (
      <div className="slideshow-overlay animate-fade-in" role="dialog" aria-modal="true">
        <div className="slide-loading-placeholder">
          <SpinnerIcon className="spinner-icon" />
          {generationProgress && <span className="slide-loading-text">{generationProgress.message}</span>}
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  if (!currentSlide) {
      return null;
  }

  return (
    <div 
      className="slideshow-overlay animate-fade-in" 
      role="dialog" 
      aria-modal="true"
      onClick={() => setIsTextVisible(v => !v)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Image Layer */}
      <div className="slideshow-image-container">
        {currentSlide.imageUrl ? (
            <img src={currentSlide.imageUrl} alt={currentSlide.title} className="slide-image" key={currentSlide.imageUrl} />
        ) : (
            <div className="slide-loading-placeholder">
                <SpinnerIcon className="spinner-icon" />
                <span className="slide-loading-text">Dibuixant...</span>
            </div>
        )}
      </div>

      {/* UI and Text Layer */}
       <div className="slideshow-top-controls">
          {isGenerating && generationProgress && <GenerationProgressIndicator progress={generationProgress} />}
          <div className="slideshow-action-buttons">
            <button
              onClick={(e) => { e.stopPropagation(); handleExportPdf(); }}
              className="slideshow-control-button"
              aria-label="Descarregar PDF"
              disabled={isExportingPdf || isGenerating}
            >
              {isExportingPdf ? <SpinnerIcon className="h-6 w-6 animate-scribble-spin" /> : <DownloadIcon />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="slideshow-control-button" aria-label="Tancar presentació" disabled={isGenerating}>
              <CloseIcon />
            </button>
          </div>
        </div>
      
        <div className={`slide-text-content ${isTextVisible ? 'visible' : ''}`}>
             <h3 className="slide-title">{currentSlide.title}</h3>
             <p className="slide-body">{currentSlide.content}</p>
        </div>

        {slides.length > 1 && (
            <>
            <button 
                onClick={(e) => { e.stopPropagation(); goToPrevious(); }} 
                className="slideshow-nav-button prev" 
                aria-label="Anterior"
            >
                <ChevronLeftIcon />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); goToNext(); }} 
                className="slideshow-nav-button next" 
                aria-label="Següent"
            >
                <ChevronRightIcon />
            </button>
            </>
        )}

        {slides.length > 1 && (
              <div className="slide-indicators">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(index);
                        }}
                        className={`indicator-dot ${currentIndex === index ? 'active' : ''}`}
                        aria-label={`Anar a la diapositiva ${index + 1}`}
                    />
                ))}
            </div>
        )}
    </div>
  );
};
