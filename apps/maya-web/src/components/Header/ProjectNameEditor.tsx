/**
 * ProjectNameEditor Component
 * 
 * Handles inline editing of project names in the header.
 * Extracted from Header.tsx to reduce component complexity.
 */

import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';

// Theme constants - will be migrated to centralized theme system
const win95 = {
  bgColor: '#c0c0c0',
  textColor: '#000000',
  borderLight: '#ffffff',
  borderDark: '#808080',
  fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
};

const funk = {
  bgColor: '#ffffff',
  textColor: '#1e1e1e',
  borderColor: '#1e1e1e',
  fontFamily: "'Inter', sans-serif",
};

const cyber = {
  bgColor: '#0a2540',
  lineColor: '#4da6ff',
  lineDim: '#2d7acc',
  textColor: '#e8f4ff',
  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
};

const clean = {
  bgColor: '#ffffff',
  textColor: '#1A1A1A',
  borderColor: '#3A3A3A',
  separatorColor: '#E8EAED',
  fontFamily: "'IBM Plex Mono', monospace",
};

interface ProjectNameEditorProps {
  projectName?: string;
  onRenameProject?: (newName: string) => Promise<boolean>;
  toolbarStyle?: ToolbarStyle;
  /** Use modern CSS class-based styling */
  useModernStyles?: boolean;
}

export function ProjectNameEditor({
  projectName,
  onRenameProject,
  toolbarStyle = 'modern',
  useModernStyles = false,
}: ProjectNameEditorProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(projectName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  const isClean = toolbarStyle === 'clean';

  // Windows 95 border helpers
  const win95Inset = `${win95.borderDark} ${win95.borderLight} ${win95.borderLight} ${win95.borderDark}`;

  useEffect(() => {
    setEditNameValue(projectName || '');
  }, [projectName]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed || trimmed === projectName || !onRenameProject) {
      setEditNameValue(projectName || '');
      setIsEditingName(false);
      return;
    }
    setIsSavingName(true);
    const success = await onRenameProject(trimmed);
    setIsSavingName(false);
    if (success) {
      setIsEditingName(false);
    } else {
      setEditNameValue(projectName || '');
    }
  };

  const handleCancelNameEdit = () => {
    setEditNameValue(projectName || '');
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelNameEdit();
    }
  };

  // Modern CSS class-based rendering (for modern toolbar style)
  if (useModernStyles) {
    return isEditingName ? (
      <div className="header-project-edit">
        <input
          ref={nameInputRef}
          type="text"
          value={editNameValue}
          onChange={(e) => setEditNameValue(e.target.value)}
          onKeyDown={handleNameKeyDown}
          onBlur={handleSaveName}
          disabled={isSavingName}
          maxLength={100}
          className="header-project-input"
        />
        <button 
          type="button"
          onClick={handleSaveName}
          className="header-inline-icon"
          aria-label="Save project name"
          disabled={isSavingName}
        >
          <Check size={14} />
        </button>
        <button 
          type="button"
          onClick={handleCancelNameEdit}
          className="header-inline-icon"
          aria-label="Cancel edit"
        >
          <X size={14} />
        </button>
      </div>
    ) : (
      <div 
        className="header-project-name"
        onClick={() => setIsEditingName(true)}
        onMouseEnter={() => setIsHoveringName(true)}
        onMouseLeave={() => setIsHoveringName(false)}
      >
        <span>{projectName}</span>
        {isHoveringName && (
          <Edit3 
            size={12} 
            style={{ 
              color: 'var(--text-color-secondary)',
              opacity: 0.7,
            }} 
          />
        )}
      </div>
    );
  }

  // Inline style-based rendering (for themed toolbar styles)
  const getInputStyle = (): React.CSSProperties => ({
    padding: isClean ? '2px 6px' : isCyber ? '2px 8px' : isFunk ? '3px 8px' : isWindows95 ? '1px 4px' : '4px 8px',
    fontSize: isClean ? '11px' : isCyber ? '11px' : isFunk ? '12px' : isWindows95 ? '11px' : '13px',
    fontFamily: isClean ? clean.fontFamily : isCyber ? cyber.fontFamily : isFunk ? funk.fontFamily : isWindows95 ? win95.fontFamily : 'inherit',
    fontWeight: isClean ? 600 : 500,
    backgroundColor: isClean ? clean.bgColor : isCyber ? 'transparent' : isFunk ? funk.bgColor : isWindows95 ? '#ffffff' : '#ffffff',
    border: isClean ? `1px solid ${clean.borderColor}` : isCyber ? `1px solid ${cyber.lineColor}` : isFunk ? `2px solid ${funk.borderColor}` : isWindows95 ? `2px solid ${win95Inset}` : '1px solid #D0D0D0',
    borderRadius: isClean ? '3px' : isFunk ? '4px' : '4px',
    color: isClean ? clean.textColor : isCyber ? cyber.textColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#3B3B3B',
    outline: 'none',
    minWidth: '100px',
    height: isClean ? '20px' : isCyber ? '22px' : isFunk ? '22px' : isWindows95 ? '18px' : '24px',
    boxSizing: 'border-box' as const,
  });

  const getContainerStyle = (): React.CSSProperties => ({
    display: 'flex', 
    alignItems: 'center', 
    gap: isClean ? '4px' : '4px', 
    marginLeft: isClean ? '6px' : isCyber ? '8px' : isFunk ? '4px' : isWindows95 ? '4px' : '12px',
    height: isClean ? '22px' : isCyber ? '24px' : isFunk ? '24px' : isWindows95 ? '20px' : '26px',
  });

  const getIconButtonStyle = (): React.CSSProperties => ({
    cursor: 'pointer',
    padding: isClean ? '2px' : isCyber ? '3px' : isFunk ? '3px' : isWindows95 ? '2px' : '4px',
    backgroundColor: isClean ? 'transparent' : isCyber ? 'transparent' : isFunk ? funk.bgColor : isWindows95 ? win95.bgColor : 'transparent',
    border: isClean ? 'none' : isCyber ? 'none' : isFunk ? `1px solid ${funk.borderColor}` : isWindows95 ? '1px outset' : 'none',
    borderRadius: isClean ? '2px' : isFunk ? '2px' : '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const getNameDisplayStyle = (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: isClean ? '6px' : isCyber ? '8px' : isFunk ? '4px' : isWindows95 ? '4px' : '12px',
    cursor: 'pointer',
    padding: isClean ? '2px 4px' : isCyber ? '2px 6px' : isFunk ? '2px 6px' : isWindows95 ? '1px 4px' : '4px 8px',
    borderRadius: isClean ? '3px' : isFunk ? '4px' : '4px',
    transition: 'background-color 0.15s',
    backgroundColor: isHoveringName 
      ? (isClean ? '#f5f5f5' : isCyber ? 'rgba(77, 166, 255, 0.1)' : isFunk ? '#f5f5f5' : isWindows95 ? '#d4d4d4' : '#f5f5f5')
      : 'transparent',
  });

  const getNameTextStyle = (): React.CSSProperties => ({
    fontSize: isClean ? '11px' : isCyber ? '11px' : isFunk ? '12px' : isWindows95 ? '11px' : '13px',
    fontFamily: isClean ? clean.fontFamily : isCyber ? cyber.fontFamily : isFunk ? funk.fontFamily : isWindows95 ? win95.fontFamily : 'inherit',
    fontWeight: isClean ? 600 : 500,
    color: isClean ? clean.textColor : isCyber ? cyber.textColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#3B3B3B',
    letterSpacing: isClean ? '-0.01em' : isCyber ? '0.02em' : 'normal',
  });

  return isEditingName ? (
    <div style={getContainerStyle()}>
      <input
        ref={nameInputRef}
        type="text"
        value={editNameValue}
        onChange={(e) => setEditNameValue(e.target.value)}
        onKeyDown={handleNameKeyDown}
        onBlur={handleSaveName}
        disabled={isSavingName}
        maxLength={100}
        style={getInputStyle()}
      />
      <div onClick={handleSaveName} style={getIconButtonStyle()}>
        <Check 
          size={isClean ? 12 : isCyber ? 12 : isFunk ? 14 : isWindows95 ? 12 : 14} 
          color={isClean ? clean.textColor : isCyber ? cyber.lineColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#3B3B3B'}
        />
      </div>
      <div onClick={handleCancelNameEdit} style={getIconButtonStyle()}>
        <X 
          size={isClean ? 12 : isCyber ? 12 : isFunk ? 14 : isWindows95 ? 12 : 14} 
          color={isClean ? clean.textColor : isCyber ? cyber.lineColor : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#3B3B3B'}
        />
      </div>
    </div>
  ) : (
    <div 
      style={getNameDisplayStyle()}
      onClick={() => setIsEditingName(true)}
      onMouseEnter={() => setIsHoveringName(true)}
      onMouseLeave={() => setIsHoveringName(false)}
    >
      <span style={getNameTextStyle()}>{projectName}</span>
      {isHoveringName && (
        <Edit3 
          size={isClean ? 10 : isCyber ? 10 : isFunk ? 11 : isWindows95 ? 10 : 12} 
          color={isClean ? clean.textColor : isCyber ? cyber.lineDim : isFunk ? funk.textColor : isWindows95 ? win95.textColor : '#6B6B6B'}
          style={{ opacity: 0.7 }}
        />
      )}
    </div>
  );
}

export default ProjectNameEditor;

