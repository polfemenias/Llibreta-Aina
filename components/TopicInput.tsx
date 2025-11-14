import React, { useState, useEffect, useRef } from 'react';
import type { ImageStyle } from '../types';
import { PaperPlaneIcon, MicrophoneIcon, RecordingIcon } from './Icons';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface TopicInputProps {
  onGenerate: (topic: string, style: ImageStyle) => void;
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
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>(styles[0]);
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
    if (finalTopic.trim()) {
      onGenerate(finalTopic.trim(), selectedStyle);
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
          rows={2}
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
              value={selectedStyle.name}
              onChange={(e) => {
                  const style = styles.find(s => s.name === e.target.value);
                  if (style) setSelectedStyle(style);
              }}
              className="style-select"
              disabled={isLoading}
              >
              {styles.map(style => (
                  <option key={style.name} value={style.name}>{style.name}</option>
              ))}
          </select>
          <button
              type="submit"
              disabled={isLoading || (!topic.trim() && !transcript.trim())}
              className="generate-button"
              aria-label={isLoading ? 'Creant...' : 'Crea!'}
              >
              <PaperPlaneIcon />
              <span className="generate-button-text">{isLoading ? 'Creant...' : 'Crea!'}</span>
          </button>
      </div>
       {isListening && <AudioWaveVisualizer />}
    </form>
  );
};