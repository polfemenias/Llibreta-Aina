import React, { useState } from 'react';

interface PasswordProtectionProps {
  onSuccess: () => void;
}

export const PasswordProtection: React.FC<PasswordProtectionProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const correctPassword = 'Aina2015';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simple delay to simulate a check and prevent brute-forcing
    setTimeout(() => {
      if (password === correctPassword) {
        onSuccess();
      } else {
        setError('La contrasenya no és correcta.');
        setIsLoading(false);
        setPassword('');
      }
    }, 300);
  };

  return (
    <div className="password-protection-overlay">
      <div className="password-protection-container">
        <h2 className="password-protection-title">La Llibreta de l'Aina</h2>
        <form onSubmit={handleSubmit}>
          <div className="password-input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contrasenya"
              className="password-input"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="password-submit-button"
            disabled={isLoading || !password}
          >
            {isLoading ? 'Verificant...' : 'Entrar'}
          </button>
          {error && <p className="password-error">{error}</p>}
        </form>
      </div>
    </div>
  );
};