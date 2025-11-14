import React, { useState, useEffect, useCallback } from 'react';
import { TopicInput } from './components/TopicInput';
import { Slideshow } from './components/Slideshow';
import { HistoryPanel } from './components/HistoryPanel';
import { PasswordProtection } from './components/PasswordProtection';
import { generatePresentationContent, generateSlideImage } from './services/geminiService';
import { onPresentationsUpdate, addPresentation, clearAllPresentations, isFirebaseConfigured, getInitializationError } from './services/firebaseService';
import type { Presentation, Slide, ImageStyle, GenerationProgress } from './types';
import { IMAGE_STYLES } from './constants';
import './app.css';

const themes = ['theme-lavender', 'theme-mint', 'theme-peach', 'theme-sky', 'theme-butter'];

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('is-authenticated') === 'true');
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [isHistoryVisible, setIsHistoryVisible] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    setFirebaseError(getInitializationError());

    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    document.body.className = randomTheme;

    let unsubscribe = () => {};
    if (isFirebaseConfigured()) {
      unsubscribe = onPresentationsUpdate((newPresentations) => {
        setPresentations(newPresentations);
      });
    } else {
      try {
        const storedPresentations = localStorage.getItem('presentations-history');
        if (storedPresentations) {
          setPresentations(JSON.parse(storedPresentations));
        }
      } catch (e) {
        console.error("Failed to load history from localStorage", e);
      }
    }
    
    if (window.innerWidth < 1024) {
      setIsHistoryVisible(false);
    }

    return () => unsubscribe();
  }, [isAuthenticated]);
  
  useEffect(() => {
    if (isAuthenticated && !isFirebaseConfigured()) {
        try {
            localStorage.setItem('presentations-history', JSON.stringify(presentations));
        } catch (e) {
            console.error("Failed to save history to localStorage", e);
        }
    }
  }, [presentations, isAuthenticated]);


  const handleCorrectPassword = () => {
    sessionStorage.setItem('is-authenticated', 'true');
    setIsAuthenticated(true);
  };

  const handleGenerate = async (topic: string, style: ImageStyle) => {
    if (!topic || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setFirebaseError(null);
    setCurrentPresentation(null);
    setGenerationProgress({
      currentStep: 1,
      totalSteps: 1, 
      message: getRandomMessage(contentMessages),
    });

    try {
      // Step 1: Generate all text content first
      const contentSlides = await generatePresentationContent(topic);
      const totalSteps = contentSlides.length + 1; // 1 for content + N for images
      
      const presentationWithText: Presentation = {
        id: new Date().toISOString(),
        topic,
        style,
        slides: contentSlides.map(s => ({ ...s, imageUrl: undefined })),
      };

      // Show the slideshow immediately with text and placeholders for images
      setCurrentPresentation(presentationWithText);

      // Step 2: Generate images one by one and update the presentation in real-time
      const generatedSlides: Slide[] = [];
      for (let i = 0; i < contentSlides.length; i++) {
        setGenerationProgress({
            currentStep: i + 2,
            totalSteps: totalSteps,
            message: getRandomMessage(imageMessages),
        });

        const slideContent = contentSlides[i];
        const imageUrl = await generateSlideImage(slideContent.imagePrompt, style.prompt);
        const completedSlide = { ...slideContent, imageUrl };
        generatedSlides.push(completedSlide);
        
        // Update the current presentation with the new image
        setCurrentPresentation(prev => {
            if (!prev) return null;
            const updatedSlides = [...prev.slides];
            updatedSlides[i] = completedSlide;
            return { ...prev, slides: updatedSlides };
        });
      }

      // Finalize the presentation and save it in the background
      const finalPresentation: Presentation = { ...presentationWithText, slides: generatedSlides };
      
      const saveInBackground = async () => {
        try {
            if (isFirebaseConfigured()) {
                await addPresentation(finalPresentation);
            } else {
                setPresentations(prev => [finalPresentation, ...prev]);
            }
        } catch (err) {
            console.error("Failed to save presentation to cloud:", err);
            setFirebaseError(err instanceof Error ? err.message : "No s'ha pogut desar la presentació a l'historial del núvol.");
        }
      };

      saveInBackground(); // Fire-and-forget: does not block the UI

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Ha ocorregut un error desconegut.';
      setError(errorMessage);
      // Close slideshow if a critical error occurred during generation
      setCurrentPresentation(null);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
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
      if(isFirebaseConfigured()){
        await clearAllPresentations();
      } else {
        setPresentations([]);
      }
      setCurrentPresentation(null);
    } catch(err) {
      console.error("Error clearing history from App:", err);
      setError(err instanceof Error ? err.message : "No s'ha pogut buidar l'historial.")
    }
  };

  const handleCloseSlideshow = () => {
    // Prevent closing while generation is in progress
    if (isGenerating) return;
    setCurrentPresentation(null);
  }

  if (!isAuthenticated) {
    return <PasswordProtection onCorrectPassword={handleCorrectPassword} />;
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
          {firebaseError && (
            <div className="error-banner warning" role="status">
              <p>{firebaseError}</p>
            </div>
          )}
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
        />
      )}
    </div>
  );
}

export default App;
