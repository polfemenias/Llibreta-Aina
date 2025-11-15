import React, { useState, useEffect, useRef } from 'react';
import type { ImageStyle, Language } from '../types';
import { PaperPlaneIcon, MicrophoneIcon, RecordingIcon, ButtonSpinnerIcon } from './Icons';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface TopicInputProps {
  onGenerate: (topic: string, style: ImageStyle, language: Language) => void;
  isLoading: boolean;
  styles: ImageStyle[];
}

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const speechRecognitionSupported = !!SpeechRecognition;

const AudioWaveVisualizer = () => (
    <div className="audio-wave">
      <span className="audio-wave-bar" style={{ animationDelay: '0.1s' }}></span>
      <span className="audio-wave-bar" style={{ animationDelay: '0.2s' }}></span>
      <span className="audio-wave-bar" style={{ animationDelay: '0.3s' }}></span>
      <span className="audio-wave-bar" style={{ animationDelay: '0.4s' }}></span>
      <span className="audio-wave-bar" style={{ animationDelay: '0.5s' }}></span>
    </div>
);

export const TopicInput: React.FC<TopicInputProps> = ({ onGenerate, isLoading, styles }) => {
  const [topic, setTopic] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle | null>(null);
  const [language, setLanguage] = useState<Language>('ca');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    if (!speechRecognitionSupported) {
      console.log("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ca-ES';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setTranscript('');
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (recognitionRef.current.finalTranscript) {
         setTopic(recognitionRef.current.finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    
    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        setTranscript(interimTranscript);
        recognitionRef.current.finalTranscript = finalTranscript;
    };

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.stop();
    };
    
  }, []);

  const toggleListening = () => {
    if (isLoading) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTopic(''); // Clear topic when starting to listen
      setTranscript('');
      recognitionRef.current.finalTranscript = '';
      recognitionRef.current?.start();
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = transcript || topic;
    if (finalTopic.trim() && selectedStyle) {
      onGenerate(finalTopic.trim(), selectedStyle, language);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="topic-form">
      <div className="form-main-area">
        <textarea
          value={isListening ? transcript : topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ex: 'La vida a l'Antiga Grècia' o 'El cicle de l'aigua'"
          className="topic-textarea"
          rows={3}
          disabled={isLoading || isListening}
        />
        {speechRecognitionSupported && (
          <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`mic-button ${isListening ? 'listening' : ''}`}
              aria-label={isListening ? 'Deixar de gravar' : 'Gravar amb la veu'}
              >
              {isListening ? <RecordingIcon /> : <MicrophoneIcon />}
          </button>
        )}
      </div>
      <div className="form-controls">
        <select
            value={selectedStyle?.name || ""}
            onChange={(e) => {
                const style = styles.find(s => s.name === e.target.value);
                setSelectedStyle(style || null);
            }}
            className="style-select"
            disabled={isLoading}
            aria-label="Estil visual"
            required
            >
            <option value="" disabled>Escull el tipus d'imatge</option>
            {styles.map(style => (
                <option key={style.name} value={style.name}>{style.name}</option>
            ))}
        </select>
        <div className="language-selector">
            <button type="button" onClick={() => !isLoading && setLanguage('ca')} disabled={isLoading} className={`language-button ${language === 'ca' ? 'active' : ''}`}>Català</button>
            <button type="button" onClick={() => !isLoading && setLanguage('es')} disabled={isLoading} className={`language-button ${language === 'es' ? 'active' : ''}`}>Castellano</button>
        </div>
        <button
            type="submit"
            disabled={isLoading || (!topic.trim() && !transcript.trim()) || !selectedStyle}
            className="generate-button"
            aria-label={isLoading ? 'Creant...' : 'Crea!'}
            >
            {isLoading ? (
                <>
                    <ButtonSpinnerIcon />
                    <span className="generate-button-text">Creant...</span>
                </>
            ) : (
                <>
                    <PaperPlaneIcon />
                    <span className="generate-button-text">Crea!</span>
                </>
            )}
        </button>
      </div>
       {isListening && <AudioWaveVisualizer />}
    </form>
  );
};