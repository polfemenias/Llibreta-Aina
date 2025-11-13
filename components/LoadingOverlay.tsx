import React from 'react';
import { SpinnerIcon } from './Icons';

interface LoadingOverlayProps {
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="loading-overlay">
        <SpinnerIcon />
        <p className="loading-message font-display">{message}</p>
    </div>
  );
};