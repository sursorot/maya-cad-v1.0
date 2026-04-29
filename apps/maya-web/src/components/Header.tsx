import { useState } from 'react';
import { FilePlus, LogIn, Download } from 'lucide-react';
import type { ToolbarStyle } from './Workspace/types';
import type { AutoSaveState } from '../lib/supabase/types';
import { useAuth } from '../lib/supabase';
import { UserMenu, AuthModal } from './Auth';
import { useTheme } from '../theme/useTheme';
import { ProjectNameEditor, AutoSaveIndicator } from './Header/index';

// Legacy theme constants - kept for backward compatibility during migration
// These map to the centralized theme system in src/theme/index.ts
const win95 = {
  bgColor: '#c0c0c0',
  textColor: '#000000',
  borderLight: '#ffffff',
  borderDark: '#808080',
  borderDarker: '#404040',
  activeColor: '#000080',
  fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
};

const funk = {
  bgColor: '#ffffff',
  textColor: '#1e1e1e',
  borderColor: '#1e1e1e',
  accentPink: '#ff69b4',
  accentCyan: '#00f0ff',
  accentYellow: '#f9c500',
  shadowColor: '#1e1e1e',
  fontFamily: "'Inter', sans-serif",
};

const cyber = {
  bgColor: '#0a2540',
  paperColor: '#0d2f4d',
  lineColor: '#4da6ff',
  lineDim: '#2d7acc',
  textColor: '#e8f4ff',
  accentOrange: '#ff6b35',
  glowColor: 'rgba(77, 166, 255, 0.4)',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
};

const clean = {
  bgColor: '#ffffff',
  textColor: '#000000',
  textSecondary: '#6c6c6c',
  borderColor: '#000000',
  separatorColor: '#e0e0e0',
  activeColor: '#000000',
  fontFamily: "'IBM Plex Mono', monospace",
};

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenCanvas: () => void;
  sidebarVisible: boolean;
  canvasOpen: boolean;
  toolbarStyle?: ToolbarStyle;
  // Project-related props
  projectName?: string;
  onRenameProject?: (newName: string) => Promise<boolean>;
  autoSaveState?: AutoSaveState;
  onRetrySave?: () => void;
  /** Manual save function - called when user clicks save button */
  onManualSave?: () => void;
  /** Export function - called when user clicks export button */
  onExport?: () => void;
}

export default function Header({ 
  onToggleSidebar, 
  onOpenCanvas, 
  sidebarVisible, 
  canvasOpen, 
  toolbarStyle = 'modern',
  projectName,
  onRenameProject,
  autoSaveState,
  onRetrySave,
  onManualSave,
  onExport,
}: HeaderProps) {
  // Use centralized theme system
  const { theme, isWindows95, isFunk, isCyber, isClean, isModern, win95RaisedBorder, win95InsetBorder } = useTheme(toolbarStyle);
  
  // Auth state
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<'signIn' | 'signUp'>('signIn');
  
  const openSignIn = () => {
    setAuthModalView('signIn');
    setAuthModalOpen(true);
  };

  // Button style helper for Win95
  const getWin95ButtonStyle = (active: boolean = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '24px',
    backgroundColor: theme.colors.bg,
    border: '2px solid',
    borderColor: active ? win95InsetBorder : win95RaisedBorder,
    cursor: 'pointer',
    padding: active ? '1px 0 0 1px' : '0',
  });

  // Button style helper for Funk
  const getFunkButtonStyle = (active: boolean = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '26px',
    backgroundColor: active ? theme.colors.accent : theme.colors.bg,
    border: `2px solid ${theme.colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.1s ease-out',
  });

  // Button style helper for Cyber
  const getCyberButtonStyle = (active: boolean = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '26px',
    backgroundColor: active ? theme.colors.accent : 'transparent',
    border: `1px solid ${theme.colors.border}`,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  // Button style helper for Clean
  const getCleanButtonStyle = (active: boolean = false): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: active ? theme.colors.bgActive : 'transparent',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, background-color 0.2s ease',
  });

  const getHeaderStyle = (): React.CSSProperties | undefined => {
    if (isClean) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 12px',
        backgroundColor: theme.colors.bg,
        borderBottom: `2px solid ${theme.colors.border}`,
        fontFamily: theme.fontFamily,
        fontSize: '12px',
        height: '36px',
        boxSizing: 'border-box',
      };
    }
    if (isCyber) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 16px',
        backgroundColor: cyber.paperColor,
        borderBottom: `2px solid ${cyber.lineColor}`,
        fontFamily: cyber.fontFamily,
        fontSize: '11px',
        height: '40px',
        boxSizing: 'border-box',
      };
    }
    if (isFunk) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        backgroundColor: funk.bgColor,
        borderBottom: `3px solid ${funk.borderColor}`,
        fontFamily: funk.fontFamily,
        fontSize: '12px',
        height: '38px',
        boxSizing: 'border-box',
        boxShadow: `0 4px 0 ${funk.accentPink}`,
      };
    }
    if (isWindows95) {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '2px 4px',
        backgroundColor: win95.bgColor,
        borderBottom: `2px solid ${win95.borderDark}`,
        fontFamily: win95.fontFamily,
        fontSize: '12px',
        height: '32px',
        boxSizing: 'border-box',
      };
    }
    return undefined;
  };

  return (
    <header 
      className={isModern ? "app-header" : undefined}
      style={getHeaderStyle()}
    >
      <div 
        className={isModern ? "header-left" : undefined} 
        style={!isModern ? { display: 'flex', alignItems: 'center' } : undefined}
      >
        <div 
          className={isModern ? "header-cluster" : undefined}
          style={!isModern ? { display: 'flex', alignItems: 'center', gap: isClean ? '6px' : isCyber ? '8px' : isFunk ? '4px' : isWindows95 ? '2px' : '12px' } : undefined}
        >
          {isClean ? (
            <div 
              onClick={onToggleSidebar} 
              style={getCleanButtonStyle(sidebarVisible)}
              title="Toggle Sidebar"
              onMouseEnter={(e) => {
                if (!sidebarVisible) {
                  e.currentTarget.style.opacity = '0.6';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {sidebarVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clean.bgColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="m16 15-3-3 3-3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clean.textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="m14 15 3-3-3-3"/>
                </svg>
              )}
            </div>
          ) : isCyber ? (
            <div 
              onClick={onToggleSidebar} 
              style={getCyberButtonStyle(sidebarVisible)}
              title="Toggle Sidebar"
              onMouseEnter={(e) => {
                if (!sidebarVisible) {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = cyber.lineDim;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {sidebarVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cyber.bgColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="0"/>
                  <path d="M9 3v18"/>
                  <path d="m16 15-3-3 3-3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cyber.lineColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="0"/>
                  <path d="M9 3v18"/>
                  <path d="m14 15 3-3-3-3"/>
                </svg>
              )}
            </div>
          ) : isFunk ? (
            <div 
              onClick={onToggleSidebar} 
              style={getFunkButtonStyle(sidebarVisible)}
              title="Toggle Sidebar"
              onMouseEnter={(e) => {
                if (!sidebarVisible) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {sidebarVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={funk.bgColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="m16 15-3-3 3-3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={funk.textColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M9 3v18"/>
                  <path d="m14 15 3-3-3-3"/>
                </svg>
              )}
            </div>
          ) : isWindows95 ? (
            <div 
              onClick={onToggleSidebar} 
              style={getWin95ButtonStyle(sidebarVisible)}
              title="Toggle Sidebar"
            >
              {sidebarVisible ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={win95.textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="0"/>
                  <path d="M9 3v18"/>
                  <path d="m16 15-3-3 3-3"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={win95.textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="0"/>
                  <path d="M9 3v18"/>
                  <path d="m14 15 3-3-3-3"/>
                </svg>
              )}
            </div>
          ) : (
          <button 
            onClick={onToggleSidebar} 
            className="icon-toggle" 
            aria-label="Toggle Sidebar"
            data-active={sidebarVisible ? 'true' : undefined}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M9 3v18"/>
              {sidebarVisible ? <path d="m16 15-3-3 3-3"/> : <path d="m14 15 3-3-3-3"/>}
            </svg>
          </button>
          )}
          {isClean ? (
            <div 
              onClick={onOpenCanvas} 
              style={getCleanButtonStyle(canvasOpen)}
              title="New Canvas"
              onMouseEnter={(e) => {
                if (!canvasOpen) {
                  e.currentTarget.style.opacity = '0.6';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <FilePlus size={14} style={{ color: canvasOpen ? clean.bgColor : clean.textColor }} />
            </div>
          ) : isCyber ? (
            <div 
              onClick={onOpenCanvas} 
              style={getCyberButtonStyle(canvasOpen)}
              title="New Canvas"
              onMouseEnter={(e) => {
                if (!canvasOpen) {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = cyber.lineDim;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <FilePlus size={16} style={{ color: canvasOpen ? cyber.bgColor : cyber.lineColor }} />
            </div>
          ) : isFunk ? (
            <div 
              onClick={onOpenCanvas} 
              style={getFunkButtonStyle(canvasOpen)}
              title="New Canvas"
              onMouseEnter={(e) => {
                if (!canvasOpen) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <FilePlus size={16} style={{ color: canvasOpen ? funk.bgColor : funk.textColor }} />
            </div>
          ) : isWindows95 ? (
            <div 
              onClick={onOpenCanvas} 
              style={getWin95ButtonStyle(canvasOpen)}
              title="New Canvas"
            >
              <FilePlus size={16} style={{ color: canvasOpen ? win95.activeColor : win95.textColor }} />
            </div>
          ) : (
          <button 
            onClick={onOpenCanvas} 
            className="icon-toggle" 
            aria-label="New Canvas" 
            title="New Canvas"
            data-active={canvasOpen ? 'true' : undefined}
          >
            <FilePlus className="icon" />
          </button>
          )}

          {/* Project name and save indicator - styled per theme, positioned on left */}
          {projectName && (
            isModern ? (
              <>
                <div className="header-divider" />
                <ProjectNameEditor
                  projectName={projectName}
                  onRenameProject={onRenameProject}
                  toolbarStyle={toolbarStyle}
                  useModernStyles={true}
                />
                <div className="header-divider" />
                {autoSaveState && (
                  <AutoSaveIndicator
                    autoSaveState={autoSaveState}
                    onRetrySave={onRetrySave}
                    onManualSave={onManualSave}
                    toolbarStyle={toolbarStyle}
                    useModernStyles={true}
                  />
                )}
              </>
            ) : (
              <>
                {/* Separator before project info */}
                <div style={{
                  width: '1px',
                  height: isClean ? '18px' : isCyber ? '20px' : isFunk ? '18px' : isWindows95 ? '16px' : '18px',
                  backgroundColor: isClean ? clean.separatorColor : isCyber ? cyber.lineDim : isFunk ? funk.borderColor : isWindows95 ? win95.borderDark : '#D0D0D0',
                  marginLeft: isClean ? '6px' : isCyber ? '8px' : isFunk ? '4px' : isWindows95 ? '4px' : '12px',
                  opacity: isClean ? 1 : isCyber ? 0.5 : isFunk ? 0.4 : isWindows95 ? 1 : 0.6,
                }} />

                {/* Project Name Editor */}
                <ProjectNameEditor
                  projectName={projectName}
                  onRenameProject={onRenameProject}
                  toolbarStyle={toolbarStyle}
                />

                {/* Separator between name and save status */}
                <div style={{
                  width: '1px',
                  height: isClean ? '18px' : isCyber ? '20px' : isFunk ? '18px' : isWindows95 ? '16px' : '18px',
                  backgroundColor: isClean ? clean.separatorColor : isCyber ? cyber.lineDim : isFunk ? funk.borderColor : isWindows95 ? win95.borderDark : '#D0D0D0',
                  marginLeft: isClean ? '6px' : isCyber ? '8px' : isFunk ? '4px' : isWindows95 ? '4px' : '12px',
                  opacity: isClean ? 1 : isCyber ? 0.5 : isFunk ? 0.4 : isWindows95 ? 1 : 0.6,
                }} />

                {/* Auto Save Indicator */}
                {autoSaveState && (
                  <AutoSaveIndicator
                    autoSaveState={autoSaveState}
                    onRetrySave={onRetrySave}
                    onManualSave={onManualSave}
                    toolbarStyle={toolbarStyle}
                  />
                )}
              </>
            )
          )}
          
          {/* Export Button */}
          {onExport && canvasOpen && (
            isModern ? (
              <>
                <div className="header-divider" />
                <button
                  onClick={onExport}
                  className="header-export-button"
                  aria-label="Export"
                  title="Export"
                >
                  <Download size={14} />
                </button>
              </>
            ) : (
              <>
                {/* Separator before export */}
                <div style={{
                  width: '1px',
                  height: isClean ? '18px' : isCyber ? '20px' : isFunk ? '18px' : isWindows95 ? '16px' : '18px',
                  backgroundColor: isClean ? clean.separatorColor : isCyber ? cyber.lineDim : isFunk ? funk.borderColor : isWindows95 ? win95.borderDark : '#D0D0D0',
                  marginLeft: isClean ? '6px' : isCyber ? '8px' : isFunk ? '4px' : isWindows95 ? '4px' : '8px',
                  opacity: isClean ? 1 : isCyber ? 0.5 : isFunk ? 0.4 : isWindows95 ? 1 : 0.6,
                }} />
                
                {isClean ? (
                  <button
                    onClick={onExport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '3px',
                      color: clean.textColor,
                      cursor: 'pointer',
                      transition: 'opacity 0.2s ease',
                      marginLeft: '6px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    <Download size={14} />
                  </button>
                ) : isCyber ? (
                  <button
                    onClick={onExport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      height: '26px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${cyber.lineDim}`,
                      color: cyber.textColor,
                      fontSize: '10px',
                      fontFamily: cyber.fontFamily,
                      fontWeight: 500,
                      letterSpacing: '0.5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      marginLeft: isCyber ? '8px' : '4px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = cyber.lineColor;
                      e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = cyber.lineDim;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Download size={14} />
                    Export
                  </button>
                ) : isFunk ? (
                  <button
                    onClick={onExport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      height: '26px',
                      backgroundColor: funk.bgColor,
                      border: `2px solid ${funk.borderColor}`,
                      borderRadius: '4px',
                      color: funk.textColor,
                      fontSize: '12px',
                      fontFamily: funk.fontFamily,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.1s ease-out',
                      marginLeft: '4px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Download size={14} />
                    Export
                  </button>
                ) : isWindows95 ? (
                  <button
                    onClick={onExport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      height: '24px',
                      backgroundColor: win95.bgColor,
                      border: '2px solid',
                      borderColor: `${win95.borderLight} ${win95.borderDark} ${win95.borderDark} ${win95.borderLight}`,
                      color: win95.textColor,
                      fontSize: '11px',
                      fontFamily: win95.fontFamily,
                      cursor: 'pointer',
                      marginLeft: '4px',
                    }}
                  >
                    <Download size={14} />
                    Export
                  </button>
                ) : (
                  <button
                    onClick={onExport}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: '#6F62A4',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      fontFamily: "'Inter', sans-serif",
                      marginLeft: '8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#5d5291';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#6F62A4';
                    }}
                  >
                    <Download size={14} />
                    Export
                  </button>
                )}
              </>
            )
          )}
        </div>
      </div>

      
      {/* For modern theme (grid layout): empty center placeholder to maintain 3-column structure */}
      {/* For other themes (flexbox): spacer to push auth section to right */}
      {(isWindows95 || isFunk || isCyber || isClean) ? (
        <div style={{ flex: 1 }} />
      ) : (
        <div className="header-center" />
      )}

      {/* Auth Section - Sign In button or User Menu */}
      <div 
        className={isModern ? "header-right" : undefined}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: isClean ? '6px' : isCyber ? '8px' : isFunk ? '6px' : isWindows95 ? '4px' : '10px' }}
      >
        {!authLoading && (
          isAuthenticated ? (
            <UserMenu variant={isClean ? 'clean' : isCyber ? 'cyber' : isFunk ? 'funk' : isWindows95 ? 'windows95' : 'modern'} />
          ) : (
            isClean ? (
              <button
                onClick={openSignIn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '3px',
                  color: clean.textColor,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <LogIn size={16} />
              </button>
            ) : isCyber ? (
              <button
                onClick={openSignIn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  height: '26px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${cyber.lineDim}`,
                  color: cyber.textColor,
                  fontSize: '10px',
                  fontFamily: cyber.fontFamily,
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = cyber.lineColor;
                  e.currentTarget.style.boxShadow = `0 0 8px ${cyber.glowColor}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = cyber.lineDim;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <LogIn size={14} />
                Sign In
              </button>
            ) : isFunk ? (
              <button
                onClick={openSignIn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  height: '26px',
                  backgroundColor: funk.bgColor,
                  border: `2px solid ${funk.borderColor}`,
                  borderRadius: '4px',
                  color: funk.textColor,
                  fontSize: '12px',
                  fontFamily: funk.fontFamily,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.1s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `2px 2px 0 ${funk.accentYellow}`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <LogIn size={14} />
                Sign In
              </button>
            ) : isWindows95 ? (
              <button
                onClick={openSignIn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  height: '24px',
                  backgroundColor: win95.bgColor,
                  border: '2px solid',
                  borderColor: `${win95.borderLight} ${win95.borderDark} ${win95.borderDark} ${win95.borderLight}`,
                  color: win95.textColor,
                  fontSize: '11px',
                  fontFamily: win95.fontFamily,
                  cursor: 'pointer',
                }}
              >
                <LogIn size={14} />
                Sign In
              </button>
            ) : (
              <button
                onClick={openSignIn}
                className="sign-in-button"
                aria-label="Sign In"
                title="Sign In"
              >
                <LogIn size={14} />
              </button>
            )
          )
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialView={authModalView}
      />

    </header>
  );
}

