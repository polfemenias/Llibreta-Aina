import React, { useState, useEffect, useCallback } from 'react';
import { TopicInput } from './components/TopicInput';
import { Slideshow } from './components/Slideshow';
import { HistoryPanel } from './components/HistoryPanel';
import { LoadingOverlay } from './components/LoadingOverlay';
import { PasswordProtection } from './components/PasswordProtection';
import { generatePresentationContent, generateSlideImage } from './services/geminiService';
import { onPresentationsUpdate, addPresentation, clearAllPresentations } from './services/firebaseService';
import type { Presentation, Slide, ImageStyle } from './types';
import { IMAGE_STYLES } from './constants';
import './app.css';

const themes = ['theme-lavender', 'theme-mint', 'theme-peach', 'theme-sky', 'theme-butter'];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('is-authenticated') === 'true');
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    document.body.className = randomTheme;

    // Set up Firebase real-time listener
    const unsubscribe = onPresentationsUpdate((newPresentations) => {
        setPresentations(newPresentations);
    });
    
    if (window.innerWidth < 1024) {
      setIsHistoryVisible(false);
    }

    // Cleanup listener on component unmount or auth change
    return () => unsubscribe();
  }, [isAuthenticated]);

  const handleCorrectPassword = () => {
    sessionStorage.setItem('is-authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleGenerate = async (topic: string, style: ImageStyle) => {
    if (!topic || isGenerating) return;

    setIsLoading(true);
    setIsGenerating(true);
    setError(null);
    setCurrentPresentation(null);
    setLoadingMessage('Creant la història...');

    try {
      const contentSlides = await generatePresentationContent(topic);
      
      const newPresentation: Presentation = {
        id: new Date().toISOString(),
        topic,
        style,
        slides: contentSlides.map(s => ({ ...s, imageUrl: undefined })),
      };

      setCurrentPresentation(newPresentation);
      setIsLoading(false);
      setLoadingMessage('');

      const generatedSlides: Slide[] = [];
      const slidesToGenerate = [...contentSlides];
      
      for (let i = 0; i < slidesToGenerate.length; i++) {
        const slideContent = slidesToGenerate[i];
        const imageUrl = await generateSlideImage(slideContent.imagePrompt, style.prompt);
        const completedSlide = { ...slideContent, imageUrl };
        generatedSlides.push(completedSlide);
        
        setCurrentPresentation(prev => prev ? { 
            ...prev, 
            slides: [
                ...generatedSlides, 
                ...slidesToGenerate.slice(i + 1).map(s => ({...s, imageUrl: undefined}))
            ] 
        } : null);
      }

      const finalPresentation: Presentation = { ...newPresentation, slides: generatedSlides };
      await addPresentation(finalPresentation);
      // The state will be updated by the real-time listener automatically.

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Ha ocorregut un error desconegut.');
      setCurrentPresentation(null);
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
      setLoadingMessage('');
    }
  };
  
  const handleSelectPresentation = (presentation: Presentation) => {
    setCurrentPresentation(presentation);
    if(window.innerWidth < 1024) {
      setIsHistoryVisible(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearAllPresentations();
      // The listener will automatically empty the presentations array.
      setCurrentPresentation(null);
    } catch(err) {
      console.error("Error clearing history from App:", err);
      setError(err instanceof Error ? err.message : "No s'ha pogut buidar l'historial.")
    }
  };

  const handleCloseSlideshow = () => {
    setCurrentPresentation(null);
  }

  if (!isAuthenticated) {
    return <PasswordProtection onCorrectPassword={handleCorrectPassword} />;
  }

  return (
    <div className="app-container">
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      
      <HistoryPanel
        presentations={presentations}
        onSelect={handleSelectPresentation}
        onClear={handleClearHistory}
        isVisible={isHistoryVisible}
        onToggle={() => setIsHistoryVisible(!isHistoryVisible)}
      />

      <div className={`main-content ${isHistoryVisible ? 'history-visible' : ''}`}>
        <button
          onClick={() => setIsHistoryVisible(!isHistoryVisible)}
          className="menu-button"
          aria-label="Toggle History Panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <main className="main-area">
          {error && (
            <div className="error-banner" role="alert">
              <p className="font-bold">Error!</p>
              <p>{error}</p>
            </div>
          )}

          <div className="intro-text">
              <h1 className="intro-title">LA LLIBRETA DE L'AINA</h1>
              <p className="intro-tagline">On aprendre és una aventura.</p>
          </div>
          
          <div className="form-wrapper">
            <div className="form-container">
                <TopicInput onGenerate={handleGenerate} isLoading={isGenerating} styles={IMAGE_STYLES} />
            </div>
          </div>
        </main>
      </div>
      
      {currentPresentation && (
        <Slideshow 
          key={currentPresentation.id} 
          presentation={currentPresentation} 
          onClose={handleCloseSlideshow}
        />
      )}
    </div>
  );
}

export default App;