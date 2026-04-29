import { useState, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FolderOpen,
  Plus,
  Clock,
  MoreHorizontal,
  Trash2,
  Edit3,
  Copy as CopyIcon,
  Archive,
  FileText,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { useProjectList } from '../lib/supabase/hooks';
import type { ProjectSummary } from '../lib/supabase/types';
import type { ToolbarStyle } from './Workspace/types';
import { themes } from '../theme';

// Extended theme interface for sidebar-specific properties
// Maps the centralized theme to sidebar's expected format
const sidebarThemes = {
  modern: {
    ...themes.modern.colors,
    fontFamily: themes.modern.fontFamily,
    accentYellow: '#f9c500',
    accentOrange: '#f97316',
  },
  windows95: {
    ...themes.windows95.colors,
    fontFamily: themes.windows95.fontFamily,
    accentYellow: '#808000',
    accentOrange: '#c00000',
  },
  funk: {
    ...themes.funk.colors,
    fontFamily: themes.funk.fontFamily,
    accentYellow: '#f9c500',
    accentOrange: '#ff6b35',
  },
  cyber: {
    ...themes.cyber.colors,
    fontFamily: themes.cyber.fontFamily,
    accentYellow: '#fbbf24',
    accentOrange: '#ff6b35',
  },
  clean: {
    ...themes.clean.colors,
    fontFamily: themes.clean.fontFamily,
    accentYellow: '#1565C0',
    accentOrange: '#dc2626',
  },
};

interface SidebarProps {
  currentProjectId?: string | null;
  onProjectSelect?: (projectId: string) => void;
  onNewProject?: () => void;
  onProjectAction?: (action: 'rename' | 'duplicate' | 'archive' | 'delete', projectId: string) => void;
  onClose?: () => void;
  toolbarStyle?: ToolbarStyle;
}

interface ProjectItemProps {
  project: ProjectSummary;
  isActive: boolean;
  onSelect: () => void;
  onAction: (action: 'rename' | 'duplicate' | 'archive' | 'delete') => void;
  theme: typeof sidebarThemes.modern;
  toolbarStyle: ToolbarStyle;
}

const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

const ProjectItem = ({ project, isActive, onSelect, onAction, theme, toolbarStyle }: ProjectItemProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';
  
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: isWindows95 ? '3px 4px' : '4px 6px',
        borderRadius: isWindows95 ? '0' : isCyber ? '0' : '4px',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        position: 'relative',
        backgroundColor: isActive ? theme.bgActive : 'transparent',
        border: isActive && isCyber ? `1px solid ${theme.borderGlow}` : 'none',
        boxShadow: isCyber && isActive ? `0 0 6px ${sidebarThemes.cyber.glowColor}` : 'none',
        fontFamily: theme.fontFamily,
        color: isActive 
          ? (isWindows95 || isFunk || isClean ? '#ffffff' : isCyber ? theme.bg : theme.accent) 
          : theme.text,
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = theme.bgHover;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <FileText style={{ 
        width: 12, 
        height: 12, 
        flexShrink: 0, 
        opacity: 0.6,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: '0.7rem', 
          fontWeight: 500, 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          lineHeight: '1.3',
        }}>
          {project.name}
        </div>
        <div style={{ 
          fontSize: '0.6rem', 
          color: isActive 
            ? (isWindows95 || isFunk || isClean ? 'rgba(255,255,255,0.7)' : theme.textSecondary) 
            : theme.textMuted,
          display: 'flex', 
          alignItems: 'center', 
          gap: '2px',
        }}>
          <Clock style={{ width: 8, height: 8 }} />
          {formatRelativeTime(project.updated_at)}
        </div>
      </div>
      
      {/* Actions menu */}
      <div style={{ position: 'relative' }}>
        <button
          style={{
            padding: '2px',
            borderRadius: '3px',
            opacity: 0,
            transition: 'opacity 0.1s',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isActive ? (isWindows95 || isFunk || isClean ? '#ffffff' : theme.text) : theme.textSecondary,
          }}
          className="project-item-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreHorizontal style={{ width: 10, height: 10 }} />
        </button>
        
        {showMenu && (
          <>
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }} 
            />
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '2px',
              zIndex: 20,
              backgroundColor: isCyber ? theme.bgHeader : theme.bg,
              border: `1px solid ${theme.border}`,
              borderRadius: isWindows95 ? '0' : isCyber ? '0' : '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '2px',
              minWidth: '100px',
            }}>
              {[
                { action: 'rename' as const, icon: Edit3, label: 'Rename' },
                { action: 'duplicate' as const, icon: CopyIcon, label: 'Duplicate' },
                { action: 'archive' as const, icon: Archive, label: 'Archive' },
              ].map(({ action, icon: Icon, label }) => (
              <button
                  key={action}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 6px',
                    fontSize: '0.65rem',
                    color: theme.text,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: theme.fontFamily,
                    textAlign: 'left',
                    borderRadius: '3px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                onClick={(e) => {
                  e.stopPropagation();
                    onAction(action);
                  setShowMenu(false);
                }}
              >
                  <Icon style={{ width: 10, height: 10 }} />
                  {label}
              </button>
              ))}
              <div style={{ 
                borderTop: `1px solid ${theme.border}`, 
                margin: '2px 0',
                opacity: 0.3,
              }} />
              <button
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 6px',
                  fontSize: '0.65rem',
                  color: isCyber ? sidebarThemes.cyber.accentOrange : isFunk ? sidebarThemes.funk.accent : '#dc2626',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: theme.fontFamily,
                  textAlign: 'left',
                  borderRadius: '3px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('delete');
                  setShowMenu(false);
                }}
              >
                <Trash2 style={{ width: 10, height: 10 }} />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
      
      {/* CSS for hover effect on menu button */}
      <style>{`
        .project-item-menu-btn { opacity: 0 !important; }
        div:hover > div > .project-item-menu-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
};

export default function Sidebar({
  currentProjectId,
  onProjectSelect,
  onNewProject,
  onProjectAction,
  onClose,
  toolbarStyle = 'modern',
}: SidebarProps) {
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { projects, isLoading, recentProjects, refresh } = useProjectList({
    refreshInterval: 30000,
  });
  
  const handleProjectAction = useCallback((
    action: 'rename' | 'duplicate' | 'archive' | 'delete',
    projectId: string
  ) => {
    onProjectAction?.(action, projectId);
    setTimeout(refresh, 500);
  }, [onProjectAction, refresh]);
  
  const filteredProjects = searchQuery
    ? projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  // Get theme based on toolbarStyle
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const theme = toolbarStyle === 'windows95' ? sidebarThemes.windows95 
    : toolbarStyle === 'funk' ? sidebarThemes.funk 
    : toolbarStyle === 'cyber' ? sidebarThemes.cyber 
    : toolbarStyle === 'clean' ? sidebarThemes.clean 
    : sidebarThemes.modern;

  // Windows 95 beveled borders
  const win95Raised = isWindows95 ? `${sidebarThemes.windows95.borderLight} ${sidebarThemes.windows95.border} ${sidebarThemes.windows95.border} ${sidebarThemes.windows95.borderLight}` : '';
  const win95Inset = isWindows95 ? `${sidebarThemes.windows95.border} ${sidebarThemes.windows95.borderLight} ${sidebarThemes.windows95.borderLight} ${sidebarThemes.windows95.border}` : '';

  return (
    <aside style={{
      width: '100%',
      height: '100%',
      minWidth: 0, // Allow shrinking below content size
      backgroundColor: theme.bg,
      borderRight: `1px solid ${theme.border}`,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: theme.fontFamily,
      boxShadow: isCyber ? `0 0 20px ${sidebarThemes.cyber.glowColor}` : '0 4px 20px rgba(0,0,0,0.1)',
      overflow: 'hidden', // Prevent content from expanding sidebar
    }}>
      {/* Header - Compact panel style */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isWindows95 ? '2px 4px' : '8px 12px',
        borderBottom: `1px solid ${isWindows95 ? sidebarThemes.windows95.border : theme.border}`,
        backgroundColor: isWindows95 ? theme.accent : theme.bg,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderOpen style={{ 
            width: isWindows95 ? 12 : 14, 
            height: isWindows95 ? 12 : 14,
            color: isWindows95 ? '#ffffff' : isCyber ? theme.accent : theme.textMuted,
          }} />
          <span style={{ 
            fontSize: isWindows95 ? '0.7rem' : '0.75rem', 
            fontWeight: isWindows95 ? 700 : 600,
            color: isWindows95 ? '#ffffff' : isCyber ? theme.accent : theme.text,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Projects
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Close"
            style={{
              background: isWindows95 ? theme.bg : 'transparent',
              border: 'none',
              color: isWindows95 ? theme.text : theme.textMuted,
              fontSize: isWindows95 ? '0.65rem' : '0.75rem',
              cursor: 'pointer',
              padding: isWindows95 ? '2px 4px' : 4,
              width: isWindows95 ? 16 : 'auto',
              height: isWindows95 ? 14 : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.bgHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isWindows95 ? theme.bg : 'transparent';
            }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        )}
      </div>

      {/* New Project Button - Compact */}
      <div style={{ padding: isWindows95 ? '6px' : '8px 10px' }}>
        <button
          onClick={onNewProject}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: isWindows95 ? '4px 8px' : '6px 10px',
            backgroundColor: theme.accent,
            color: '#ffffff',
            border: isWindows95 ? `2px solid ${win95Raised}` : isFunk ? `2px solid ${theme.border}` : isCyber ? `1px solid ${theme.borderGlow}` : 'none',
            borderRadius: isWindows95 ? '0' : isFunk ? '0' : isCyber ? '0' : '4px',
            fontFamily: theme.fontFamily,
            fontSize: '0.7rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.accentHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.accent;
          }}
        >
          <Plus style={{ width: 12, height: 12 }} />
          New Project
        </button>
      </div>

      {/* Search - Compact */}
      <div style={{ padding: isWindows95 ? '0 6px 6px' : '0 10px 8px' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ 
            position: 'absolute', 
            left: '6px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            width: 10, 
            height: 10, 
            color: theme.textMuted,
          }} />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: '24px',
              paddingRight: '6px',
              paddingTop: isWindows95 ? '3px' : '4px',
              paddingBottom: isWindows95 ? '3px' : '4px',
              backgroundColor: theme.bgInput,
              border: isWindows95 ? `2px solid ${win95Inset}` : `1px solid ${theme.border}`,
              borderRadius: isWindows95 ? '0' : isCyber ? '0' : '4px',
              fontSize: '0.7rem',
              color: theme.text,
              fontFamily: theme.fontFamily,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = theme.accent;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = theme.border;
            }}
          />
        </div>
      </div>
      
      {/* Content - Compact spacing */}
      <div 
        className="panel-scroll-area"
        style={{ 
          flex: '1 1 0', 
          minHeight: 0,
          overflowY: 'auto', 
          padding: isWindows95 ? '4px' : '6px 8px',
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Recent Projects */}
        {recentProjects.length > 0 && !searchQuery && (
          <div style={{ marginBottom: '6px' }}>
            <button
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 4px',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: isCyber ? theme.accent : theme.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: theme.fontFamily,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.textSecondary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = isCyber ? theme.accent : theme.textMuted;
              }}
              onClick={() => setRecentExpanded(!recentExpanded)}
            >
              {recentExpanded ? (
                <ChevronDown style={{ width: 10, height: 10 }} />
              ) : (
                <ChevronRight style={{ width: 10, height: 10 }} />
              )}
              <Clock style={{ width: 10, height: 10 }} />
              Recent
            </button>
            
            {recentExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
                {recentProjects.map(project => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isActive={project.id === currentProjectId}
                    onSelect={() => onProjectSelect?.(project.id)}
                    onAction={(action) => handleProjectAction(action, project.id)}
                    theme={theme}
                    toolbarStyle={toolbarStyle}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Projects */}
        <div>
          <button
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 4px',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: isCyber ? theme.accent : theme.textMuted,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: theme.fontFamily,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme.textSecondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = isCyber ? theme.accent : theme.textMuted;
            }}
            onClick={() => setProjectsExpanded(!projectsExpanded)}
          >
            {projectsExpanded ? (
              <ChevronDown style={{ width: 10, height: 10 }} />
            ) : (
              <ChevronRight style={{ width: 10, height: 10 }} />
            )}
            <FolderOpen style={{ width: 10, height: 10 }} />
            {searchQuery ? `Results (${filteredProjects.length})` : 'All Projects'}
          </button>
          
          {projectsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '2px' }}>
              {isLoading ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  padding: '16px', 
                  color: theme.textMuted,
                }}>
                  <Loader2 style={{ 
                    width: 14, 
                    height: 14, 
                    animation: 'spin 1s linear infinite',
                    color: isCyber ? theme.accent : theme.textMuted,
                  }} />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '12px 6px', 
                  color: theme.textMuted,
                  fontSize: '0.7rem',
                }}>
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </div>
              ) : (
                filteredProjects.map(project => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isActive={project.id === currentProjectId}
                    onSelect={() => onProjectSelect?.(project.id)}
                    onAction={(action) => handleProjectAction(action, project.id)}
                    theme={theme}
                    toolbarStyle={toolbarStyle}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer - Compact */}
      <div style={{
        borderTop: `1px solid ${theme.border}`,
        padding: '4px 8px',
        backgroundColor: isCyber ? theme.bgHeader : 'transparent',
        flexShrink: 0,
      }}>
        <div style={{ 
          fontSize: '0.6rem', 
          color: theme.textMuted, 
          textAlign: 'center',
        }}>
          {projects.length} project{projects.length !== 1 ? 's' : ''}
        </div>
      </div>
    </aside>
  );
}
