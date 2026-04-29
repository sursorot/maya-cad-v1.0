import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './lib/supabase';

// Lazy load the workspace
const WorkspaceApp = lazy(() => import('./components/WorkspaceApp'));

/**
 * Loading fallback while pages load
 */
const PageLoader = () => (
  <div 
    style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
    }}
  >
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
    }}>
      {/* Placeholder Icon */}
      <div style={{
        width: '48px',
        height: '48px',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="1"/>
          <line x1="3" y1="9" x2="21" y2="9"/>
          <line x1="9" y1="9" x2="9" y2="21"/>
        </svg>
      </div>
      {/* Loading spinner */}
      <div style={{
        width: '24px',
        height: '24px',
        border: '2px solid #e0e0e0',
        borderTopColor: '#000000',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '14px',
        fontWeight: 600,
        color: '#000000',
        letterSpacing: '-0.02em',
      }}>
        Geometry OS
      </span>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: '#6c6c6c',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}>
        Loading
      </span>
    </div>
  </div>
);

/**
 * App - Main router component
 * Wraps the app with AuthProvider for authentication state management.
 * Goes directly to workspace (landing page hidden)
 */
function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* All routes go to WorkspaceApp - landing page hidden */}
          <Route path="/" element={<WorkspaceApp />} />
          <Route path="/app" element={<WorkspaceApp />} />
          <Route path="/workspace" element={<WorkspaceApp />} />
          {/* Auth callback route for OAuth redirects */}
          <Route path="/auth/callback" element={<WorkspaceApp />} />
          <Route path="/auth/reset-password" element={<WorkspaceApp />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;
