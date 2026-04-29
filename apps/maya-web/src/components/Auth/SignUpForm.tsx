/**
 * Sign Up Form Component
 * 
 * Allows users to create a new account with email/password or OAuth providers.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../lib/supabase/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';

interface SignUpFormProps {
  onClose: () => void;
  onSwitchToSignIn: () => void;
}

export const SignUpForm = ({ onClose, onSwitchToSignIn }: SignUpFormProps) => {
  const { signUp, signInWithGoogle, signInWithGitHub, isConfigured } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);

    const { error: signUpError, needsEmailVerification } = await signUp(email, password);

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
    } else if (needsEmailVerification) {
      setShowVerificationMessage(true);
      setIsLoading(false);
    } else {
      onClose();
    }
  };

  if (!isConfigured) {
    return (
      <div className="auth-form" style={styles.form}>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.notConfigured}>
          Authentication is not configured. Please set up Supabase credentials to enable sign-up.
        </p>
        <button onClick={onClose} style={styles.cancelButton}>
          Close
        </button>
      </div>
    );
  }

  if (showVerificationMessage) {
    return (
      <div className="auth-form" style={styles.form}>
        <div style={styles.verificationContainer}>
          <CheckCircle size={40} style={{ color: '#000000' }} />
          <h2 style={styles.title}>Check Your Email</h2>
          <p style={styles.verificationText}>
            We've sent a verification link to <strong>{email}</strong>. 
            Please click the link to verify your email and complete your registration.
          </p>
          <p style={styles.verificationNote}>
            Didn't receive the email? Check your spam folder or try signing up again.
          </p>
          <button onClick={onClose} style={styles.submitButton}>
            Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form" style={styles.form}>
      <h2 style={styles.title}>Create Account</h2>
      <p style={styles.subtitle}>Start designing beautiful spaces with Maya.</p>

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

        <div style={styles.inputGroup}>
          <label style={styles.label} htmlFor="password">Password</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p style={styles.passwordHint}>
            At least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label} htmlFor="confirmPassword">Confirm Password</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <div style={styles.divider}>
        <span style={styles.dividerLine} />
        <span style={styles.dividerText}>or continue with</span>
        <span style={styles.dividerLine} />
      </div>

      <div style={styles.oauthButtons}>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isLoading}
          style={styles.oauthButton}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        <button
          type="button"
          onClick={signInWithGitHub}
          disabled={isLoading}
          style={styles.oauthButton}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>

      <p style={styles.switchText}>
        Already have an account?{' '}
        <button onClick={onSwitchToSignIn} style={styles.switchButton}>
          Sign In
        </button>
      </p>

      <p style={styles.terms}>
        By creating an account, you agree to our{' '}
        <a href="#" style={styles.termsLink}>Terms of Service</a>{' '}
        and{' '}
        <a href="#" style={styles.termsLink}>Privacy Policy</a>.
      </p>
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
  eyeButton: {
    position: 'absolute',
    right: '10px',
    background: 'none',
    border: 'none',
    padding: '4px',
    cursor: 'pointer',
    color: '#6c6c6c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordHint: {
    margin: 0,
    fontSize: '10px',
    color: '#6c6c6c',
    fontFamily: "'IBM Plex Mono', monospace",
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
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    fontSize: '10px',
    color: '#6c6c6c',
    fontFamily: "'IBM Plex Mono', monospace",
    whiteSpace: 'nowrap',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  oauthButtons: {
    display: 'flex',
    gap: '10px',
  },
  oauthButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '9px 14px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#000000',
    backgroundColor: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  switchText: {
    marginTop: '20px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#6c6c6c',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  switchButton: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontSize: '12px',
    fontWeight: 600,
    color: '#000000',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
    textDecoration: 'underline',
  },
  terms: {
    marginTop: '14px',
    textAlign: 'center',
    fontSize: '10px',
    color: '#6c6c6c',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  termsLink: {
    color: '#000000',
    textDecoration: 'underline',
  },
  verificationContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '14px',
  },
  verificationText: {
    fontSize: '12px',
    color: '#000000',
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.5,
  },
  verificationNote: {
    fontSize: '11px',
    color: '#6c6c6c',
    fontFamily: "'IBM Plex Mono', monospace",
  },
};

export default SignUpForm;

