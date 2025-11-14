import React, { useState } from 'react';

interface PasswordProtectionProps {
  onCorrectPassword: () => void;
}

// !!! IMPORTANT !!!
// Aquesta contrasenya és ara la clau d'accés a la base de dades compartida.
// Canvia-la per una que només la teva família conegui.
const CORRECT_PASSWORD = 'FAMILIA_CREATIVA_2024';

export const PasswordProtection: React.FC<PasswordProtectionProps> = ({ onCorrectPassword }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      onCorrectPassword();
    } else {
      setError('Contrasenya incorrecta.');
      setPassword('');
    }
  };

  return (
    <div className="password-protection-overlay">
      <div className="password-form">
        <h1 className="password-title">Accés Privat</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="password-input"
            placeholder="Introdueix la contrasenya"
            autoFocus
          />
          <button type="submit" className="password-submit-button">
            Entrar
          </button>
          {error && <p className="password-error">{error}</p>}
        </form>
      </div>
    </div>
  );
};