/**
 * Forgot Password Form Component
 * 
 * Allows users to request a password reset email.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../lib/supabase/AuthContext';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

interface ForgotPasswordFormProps {
  onClose: () => void;
  onBackToSignIn: () => void;
}

export const ForgotPasswordForm = ({ onClose, onBackToSignIn }: ForgotPasswordFormProps) => {
  const { resetPassword, isConfigured } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
      setIsLoading(false);
    } else {
      setShowSuccessMessage(true);
      setIsLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="auth-form" style={styles.form}>
        <h2 style={styles.title}>Reset Password</h2>
        <p style={styles.notConfigured}>
          Authentication is not configured. Please set up Supabase credentials.
        </p>
        <button onClick={onClose} style={styles.cancelButton}>
          Close
        </button>
      </div>
    );
  }

  if (showSuccessMessage) {
    return (
      <div className="auth-form" style={styles.form}>
        <div style={styles.successContainer}>
          <CheckCircle size={40} style={{ color: '#000000' }} />
          <h2 style={styles.title}>Check Your Email</h2>
          <p style={styles.successText}>
            We've sent a password reset link to <strong>{email}</strong>. 
            Please click the link to reset your password.
          </p>
          <p style={styles.successNote}>
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <div style={styles.buttonGroup}>
            <button onClick={onBackToSignIn} style={styles.submitButton}>
              Back to Sign In
            </button>
            <button 
              onClick={() => setShowSuccessMessage(false)} 
              style={styles.secondaryButton}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form" style={styles.form}>
      <button onClick={onBackToSignIn} style={styles.backButton}>
        <ArrowLeft size={18} />
        Back to Sign In
      </button>

      <h2 style={styles.title}>Reset Password</h2>
      <p style={styles.subtitle}>
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {error && (
        <div style={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.formFields}>
        <div style={styles.inputGroup}>
          <label style={styles.label} htmlFor="email">Email</label>
          <div style={styles.inputWrapper}>
            <Mail size={18} style={styles.inputIcon} />
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              style={styles.input}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={styles.submitButton}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>
      </form>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  form: {
    width: '100%',
    maxWidth: '380px',
    padding: '28px',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '2px solid #000000',
    boxShadow: 'none',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    padding: '0',
    marginBottom: '20px',
    fontSize: '11px',
    color: '#6c6c6c',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#000000',
    fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '0 0 20px 0',
    fontSize: '12px',
    color: '#6c6c6c',
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.5,
  },
  notConfigured: {
    margin: '0 0 20px 0',
    fontSize: '12px',
    color: '#dc2626',
    fontFamily: "'IBM Plex Mono', monospace",
    textAlign: 'center',
  },
  errorMessage: {
    padding: '10px 12px',
    marginBottom: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #dc2626',
    borderRadius: '4px',
    color: '#dc2626',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  formFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#000000',
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '10px',
    color: '#6c6c6c',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '10px 10px 10px 38px',
    fontSize: '13px',
    border: '1px solid #000000',
    borderRadius: '4px',
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: "'IBM Plex Mono', monospace",
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 20px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#000000',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: "'IBM Plex Mono', monospace",
    marginTop: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  secondaryButton: {
    padding: '10px 20px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#000000',
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#000000',
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: "'IBM Plex Mono', monospace",
    width: '100%',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '14px',
  },
  successText: {
    fontSize: '12px',
    color: '#000000',
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.5,
  },
  successNote: {
    fontSize: '11px',
    color: '#6c6c6c',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
    marginTop: '6px',
  },
};

export default ForgotPasswordForm;

