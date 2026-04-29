/**
 * User Menu Component
 * 
 * Displays user info and dropdown menu with account options.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../lib/supabase/AuthContext';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface UserMenuProps {
  /** Visual style variant */
  variant?: 'modern' | 'windows95' | 'funk' | 'cyber' | 'clean';
}

// Theme colors for icons
const iconColors = {
  modern: '#6b7280',
  windows95: '#000000',
  funk: '#1e1e1e',
  cyber: '#4da6ff',
  clean: '#000000',
};

export const UserMenu = ({ variant = 'modern' }: UserMenuProps) => {
  const { user, signOut, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  if (isLoading || !user) {
    return null;
  }

  const userEmail = user.email || 'User';
  const userInitial = userEmail.charAt(0).toUpperCase();
  const displayName = user.user_metadata?.full_name || userEmail.split('@')[0];

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  const getStyles = (): Record<string, React.CSSProperties> => {
    switch (variant) {
      case 'windows95':
        return win95Styles;
      case 'funk':
        return funkStyles;
      case 'cyber':
        return cyberStyles;
      case 'clean':
        return cleanStyles;
      default:
        return modernStyles;
    }
  };

  const styles = getStyles();
  const iconColor = iconColors[variant];

  return (
    <div ref={menuRef} style={styles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={styles.trigger}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div style={styles.avatar}>
          {user.user_metadata?.avatar_url ? (
            <img 
              src={user.user_metadata.avatar_url} 
              alt={displayName}
              style={styles.avatarImage}
            />
          ) : (
            <span style={styles.avatarInitial}>{userInitial}</span>
          )}
        </div>
        <span style={styles.displayName}>{displayName}</span>
        <ChevronDown 
          size={14} 
          style={{
            ...styles.chevron,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }} 
        />
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.userInfo}>
            <div style={styles.userInfoAvatar}>
              {user.user_metadata?.avatar_url ? (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt={displayName}
                  style={styles.avatarImage}
                />
              ) : (
                <User size={20} style={{ color: iconColor }} />
              )}
            </div>
            <div style={styles.userInfoText}>
              <span style={styles.userInfoName}>{displayName}</span>
              <span style={styles.userInfoEmail}>{userEmail}</span>
            </div>
          </div>
          
          <div style={styles.divider} />
          
          <button style={styles.menuItem} onClick={() => setIsOpen(false)}>
            <Settings size={16} />
            <span>Account Settings</span>
          </button>
          
          <div style={styles.divider} />
          
          <button style={styles.menuItemDanger} onClick={handleSignOut}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

const modernStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s, border-color 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#6F62A4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600,
  },
  displayName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chevron: {
    color: '#9ca3af',
    transition: 'transform 0.2s',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    minWidth: '220px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
  },
  userInfoAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userInfoText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  userInfoName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userInfoEmail: {
    fontSize: '12px',
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '0',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    textAlign: 'left',
    transition: 'background-color 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
  menuItemDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#dc2626',
    textAlign: 'left',
    transition: 'background-color 0.15s',
    fontFamily: "'Inter', sans-serif",
  },
};

const win95Styles: Record<string, React.CSSProperties> = {
  ...modernStyles,
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: '#c0c0c0',
    border: '2px solid',
    borderColor: '#ffffff #808080 #808080 #ffffff',
    borderRadius: '0',
    cursor: 'pointer',
    fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    minWidth: '220px',
    backgroundColor: '#c0c0c0',
    border: '2px solid',
    borderColor: '#ffffff #808080 #808080 #ffffff',
    borderRadius: '0',
    overflow: 'hidden',
    zIndex: 1000,
  },
};

const funkStyles: Record<string, React.CSSProperties> = {
  ...modernStyles,
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: '#ffffff',
    border: '2px solid #1e1e1e',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#ff69b4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    minWidth: '220px',
    backgroundColor: '#ffffff',
    border: '2px solid #1e1e1e',
    borderRadius: '8px',
    boxShadow: '4px 4px 0 #1e1e1e',
    overflow: 'hidden',
    zIndex: 1000,
  },
};

const cyberStyles: Record<string, React.CSSProperties> = {
  ...modernStyles,
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: 'transparent',
    border: '1px solid #2d7acc',
    borderRadius: '0',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  displayName: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#e8f4ff',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '0',
    backgroundColor: '#4da6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    minWidth: '220px',
    backgroundColor: '#0d2f4d',
    border: '1px solid #4da6ff',
    borderRadius: '0',
    boxShadow: '0 0 20px rgba(77, 166, 255, 0.3)',
    overflow: 'hidden',
    zIndex: 1000,
  },
  userInfoName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e8f4ff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userInfoEmail: {
    fontSize: '12px',
    color: '#4da6ff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#e8f4ff',
    textAlign: 'left',
    transition: 'background-color 0.15s',
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
  },
  divider: {
    height: '1px',
    backgroundColor: '#2d7acc',
    margin: '0',
  },
};

const cleanStyles: Record<string, React.CSSProperties> = {
  ...modernStyles,
  trigger: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px',
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
    transition: 'opacity 0.2s ease',
  },
  displayName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#000000',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
  },
  chevron: {
    color: '#6c6c6c',
    transition: 'transform 0.2s',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: '0',
    minWidth: '220px',
    backgroundColor: '#ffffff',
    border: '2px solid #000000',
    borderRadius: '4px',
    overflow: 'hidden',
    zIndex: 1000,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
  },
  userInfoAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '4px',
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfoText: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userInfoName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#000000',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userInfoEmail: {
    fontSize: '12px',
    color: '#6c6c6c',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e0e0e0',
    margin: '0',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#000000',
    textAlign: 'left',
    transition: 'opacity 0.2s',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  menuItemDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#000000',
    textAlign: 'left',
    transition: 'opacity 0.2s',
    fontFamily: "'IBM Plex Mono', monospace",
  },
};

export default UserMenu;
