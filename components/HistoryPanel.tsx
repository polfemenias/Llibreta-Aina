import React from 'react';
import type { Presentation } from '../types';
import { HistoryIcon, TrashIcon, CloseIcon } from './Icons';

interface HistoryPanelProps {
  presentations: Presentation[];
  onSelect: (presentation: Presentation) => void;
  onClear: () => void;
  isVisible: boolean;
  onToggle: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ presentations, onSelect, onClear, isVisible, onToggle }) => {
  return (
    <aside className={`history-panel ${isVisible ? 'visible' : ''}`}>
      <div className="history-header">
        <div className="history-title-group">
          <HistoryIcon />
          <h2 className="history-title">Historial</h2>
        </div>
        <button
          onClick={onToggle}
          className="panel-toggle-button"
          aria-label="Tancar Historial"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="history-list-container">
        {presentations.length > 0 ? (
          <ul className="history-list">
            {presentations.map(p => (
              <li key={p.id} className="history-item">
                <button
                  onClick={() => onSelect(p)}
                  className="history-item-button"
                >
                  <p className="history-item-topic">{p.topic}</p>
                  <p className="history-item-style">{p.style.name}</p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="history-empty-state">
            <p>Les teves històries apareixeran aquí.</p>
          </div>
        )}
      </div>

      <div className="history-footer">
          {presentations.length > 0 && (
            <button
              onClick={onClear}
              className="clear-history-button"
            >
              <TrashIcon />
              <span>Netejar Historial</span>
            </button>
          )}
        </div>
    </aside>
  );
};