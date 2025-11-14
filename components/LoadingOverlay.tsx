import React from 'react';
import { SpinnerIcon } from './Icons';
import type { GenerationProgress } from '../types';

interface LoadingOverlayProps {
  progress: GenerationProgress;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ progress }) => {
  const { currentStep, totalSteps, message } = progress;
  // Calculate percentage done. We subtract 1 from currentStep because steps are 1-based.
  const percentage = totalSteps > 1 ? Math.round(((currentStep - 1) / totalSteps) * 100) : 0;
  
  // Only show the progress bar and step count after we know the total number of steps.
  const showProgress = totalSteps > 1;

  return (
    <div className="loading-overlay">
        <SpinnerIcon />
        <p className="loading-message">{message}</p>
        
        {showProgress && (
            <div className="loading-progress-container">
                <p className="loading-progress-steps">
                    Pas {currentStep} de {totalSteps}
                </p>
                <div className="loading-progress-bar">
                    <div 
                        className="loading-progress-bar-fill" 
                        style={{ width: `${percentage}%` }}
                        aria-valuenow={percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        role="progressbar"
                    ></div>
                </div>
            </div>
        )}
    </div>
  );
};
