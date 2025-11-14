import React, { useState, useEffect } from 'react';
import { TopicInput } from './components/TopicInput';
import { Slideshow } from './components/Slideshow';
import { HistoryPanel } from './components/HistoryPanel';
import { PasswordProtection } from './components/PasswordProtection';
import { generatePresentationContent, generateSlideImage } from './services/geminiService';
import * as historyService from './services/historyService';
import type { Presentation, Slide, ImageStyle, GenerationProgress } from './types';
import { IMAGE_STYLES } from './constants';
import './app.css';

const themes = ['theme-lavender', 'theme-mint', 'theme-peach', 'theme-sky', 'theme-butter'];
const AUTH_SESSION_KEY = 'aina-notebook-authenticated';

const contentMessages = [
    "Remenant les idees al cap...",
    "Consultant la biblioteca de la imaginació...",
    "Donant forma a una nova aventura...",
    "Escrivint un conte màgic...",
];

const imageMessages = [
    "Agafant els llapis de colors...",
    "Barrejant pintures màgiques...",
    "Donant vida als personatges...",
    "Pinzellades d'imaginació...",
    "Creant un món de fantasia...",
];

const getRandomMessage = (messages: string[]) => messages[Math.floor(Math.random() * messages.length)];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
    } catch {
      // If sessionStorage is not available (e.g. in private browsing mode on some browsers)
      return false;
    }
  });
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  useEffect(() => {
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    document.body.className = randomTheme;
    
    // Load history from local storage on initial render
    setPresentations(historyService.getHistory());

    if (window.innerWidth < 1024) {
      setIsHistoryVisible(false);
    }
  }, []);

  const handleGenerate = async (topic: string, style: ImageStyle) => {
    if (!topic || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setCurrentPresentation(null); // Clear previous presentation before starting

    // Set initial progress for text generation.
    setGenerationProgress({
        currentStep: 1,
        totalSteps: 1, // Placeholder
        message: getRandomMessage(contentMessages),
    });

    try {
      // 1. Generate text content first.
      const contentSlides = await generatePresentationContent(topic);
      const totalSteps = contentSlides.length + 1;

      // Create a presentation shell with text-only slides
      const presentationWithText: Presentation = {
        id: new Date().toISOString(),
        topic,
        style,
        slides: contentSlides.map(s => ({ ...s, imageUrl: undefined })),
      };
      
      setCurrentPresentation(presentationWithText);

      // 2. Loop to generate images one by one.
      const generatedSlides: Slide[] = [];
      for (let i = 0; i < contentSlides.length; i++) {
        setGenerationProgress({
            currentStep: i + 2,
            totalSteps: totalSteps,
            message: getRandomMessage(imageMessages),
        });

        const slideContent = contentSlides[i];
        // This call will now return null on transient failure instead of throwing
        const imageUrl = await generateSlideImage(slideContent.imagePrompt, style.prompt);
        
        // A slide is considered complete even if the image failed (imageUrl will be undefined)
        const completedSlide = { ...slideContent, imageUrl: imageUrl || undefined };
        generatedSlides.push(completedSlide);
        
        // Update the presentation in real-time
        setCurrentPresentation(prev => {
            if (!prev) return null;
            const updatedSlides = [...prev.slides];
            updatedSlides[i] = completedSlide;
            return { ...prev, slides: updatedSlides };
        });
      }

      const finalPresentation: Presentation = { ...presentationWithText, slides: generatedSlides };
      
      // Save to local history
      const updatedHistory = historyService.addPresentation(finalPresentation);
      setPresentations(updatedHistory);

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Ha ocorregut un error desconegut.';
      setError(errorMessage);
      setCurrentPresentation(null); // Clear on critical failure
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleRetryImage = async (slideIndex: number) => {
    if (!currentPresentation) return;

    const slideToRetry = currentPresentation.slides[slideIndex];
    const presentationStyle = currentPresentation.style;

    try {
        const imageUrl = await generateSlideImage(slideToRetry.imagePrompt, presentationStyle.prompt);
        if (imageUrl) {
            setCurrentPresentation(prev => {
                if (!prev) return null;
                const updatedSlides = [...prev.slides];
                updatedSlides[slideIndex] = { ...updatedSlides[slideIndex], imageUrl };
                const updatedPresentation = { ...prev, slides: updatedSlides };
                
                // Also update the history
                const updatedHistory = historyService.updatePresentation(updatedPresentation);
                setPresentations(updatedHistory);

                return updatedPresentation;
            });
        } else {
           // Handle case where retry also fails, perhaps show a toast message in the future
           console.error(`Failed to retry image for slide ${slideIndex}`);
           alert("El reintent ha fallat. Prova-ho de nou més tard.");
        }
    } catch (err) {
        console.error(`Error retrying image for slide ${slideIndex}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Ha ocorregut un error desconegut.';
        alert(`No s'ha pogut regenerar la imatge: ${errorMessage}`);
    }
  };
  
  const handleSelectPresentation = (presentation: Presentation) => {
    setCurrentPresentation(presentation);
    if(window.innerWidth < 1024) {
      setIsHistoryVisible(false);
    }
  };

  const handleClearHistory = () => {
    historyService.clearHistory();
    setPresentations([]);
    setCurrentPresentation(null);
  };

  const handleCloseSlideshow = () => {
    if (isGenerating) return;
    setCurrentPresentation(null);
  }

  const handleLoginSuccess = () => {
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
      setIsAuthenticated(true);
    } catch (e) {
      console.error("No s'ha pogut desar l'estat d'autenticació:", e);
      // Fallback to non-persistent auth if storage fails
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return <PasswordProtection onSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
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
              <p><strong>Error!</strong></p>
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
          isGenerating={isGenerating}
          generationProgress={generationProgress}
          onRetryImage={handleRetryImage}
        />
      )}
    </div>
  );
}

export default App;