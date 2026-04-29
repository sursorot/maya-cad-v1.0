/**
 * Auth Modal Component
 * 
 * Modal wrapper that displays sign-in, sign-up, or forgot password forms.
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';
import ForgotPasswordForm from './ForgotPasswordForm';

type AuthView = 'signIn' | 'signUp' | 'forgotPassword';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: AuthView;
}

export const AuthModal = ({ isOpen, onClose, initialView = 'signIn' }: AuthModalProps) => {
  const [currentView, setCurrentView] = useState<AuthView>(initialView);

  // Reset to initial view when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView(initialView);
    }
  }, [isOpen, initialView]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const renderForm = () => {
    switch (currentView) {
      case 'signUp':
        return (
          <SignUpForm
            onClose={onClose}
            onSwitchToSignIn={() => setCurrentView('signIn')}
          />
        );
      case 'forgotPassword':
        return (
          <ForgotPasswordForm
            onClose={onClose}
            onBackToSignIn={() => setCurrentView('signIn')}
          />
        );
      case 'signIn':
      default:
        return (
          <SignInForm
            onClose={onClose}
            onSwitchToSignUp={() => setCurrentView('signUp')}
            onForgotPassword={() => setCurrentView('forgotPassword')}
          />
        );
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          style={styles.closeButton}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        {renderForm()}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '24px',
  },
  modal: {
    position: 'relative',
    maxHeight: '90vh',
    overflowY: 'auto',
    animation: 'modalFadeIn 0.2s ease-out',
  },
  closeButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#6c6c6c',
    transition: 'opacity 0.15s',
    zIndex: 1,
  },
};

// Add keyframes for animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}

export default AuthModal;

