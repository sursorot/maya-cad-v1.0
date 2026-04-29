/**
 * Export Button Component
 * A dropdown button for quick exports with access to full export modal
 */

import React, { useState, useRef, useEffect } from 'react';
import { Download, Image, FileText, FileCode, File, ChevronDown } from 'lucide-react';
import type { ToolbarStyle } from '../Workspace/types';
import type { WorkspaceSnapshot } from '../../domain/workspace/core/types';
import { exportService } from '../../lib/export';

interface ExportButtonProps {
  snapshot: WorkspaceSnapshot;
  svgRef: React.RefObject<SVGSVGElement | null>;
  projectName?: string;
  toolbarStyle?: ToolbarStyle;
  onOpenModal?: () => void;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  snapshot,
  svgRef,
  projectName,
  toolbarStyle = 'modern',
  onOpenModal,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isWindows95 = toolbarStyle === 'windows95';
  const isFunk = toolbarStyle === 'funk';
  const isCyber = toolbarStyle === 'cyber';
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleQuickExport = async (format: 'png' | 'pdf' | 'svg' | 'geos') => {
    if (!svgRef.current && format !== 'geos') {
      return;
    }
    
    setIsExporting(true);
    setIsOpen(false);
    
    try {
      await exportService.exportAndDownload(
        format,
        format === 'geos' ? null : svgRef.current,
        snapshot,
        snapshot.selectedShapeIds,
        {
          scope: 'all',
          padding: 0.5,
          includeGrid: false,
          includeMeasurements: true,
          includeGuidelines: false,
          backgroundColor: '#ffffff',
          fileName: projectName || 'maya-export',
        }
      );
    } catch {
      // Export failed silently
    } finally {
      setIsExporting(false);
    }
  };
  
  // Theme-specific styles
  const getButtonStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      cursor: disabled || isExporting ? 'not-allowed' : 'pointer',
      opacity: disabled || isExporting ? 0.6 : 1,
      transition: 'all 0.15s ease',
    };
    
    if (isCyber) {
      return {
        ...base,
        padding: '4px 10px',
        height: '26px',
        backgroundColor: 'transparent',
        border: '1px solid #2d7acc',
        color: '#e8f4ff',
        fontSize: '10px',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        fontWeight: 500,
        letterSpacing: '0.5px',
      };
    }
    
    if (isFunk) {
      return {
        ...base,
        padding: '4px 10px',
        height: '26px',
        backgroundColor: '#ffffff',
        border: '2px solid #1e1e1e',
        borderRadius: '4px',
        color: '#1e1e1e',
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
      };
    }
    
    if (isWindows95) {
      return {
        ...base,
        padding: '2px 8px',
        height: '24px',
        backgroundColor: '#c0c0c0',
        border: '2px solid',
        borderColor: '#ffffff #808080 #808080 #ffffff',
        color: '#000000',
        fontSize: '11px',
        fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
      };
    }
    
    // Modern style
    return {
      ...base,
      padding: '6px 12px',
      height: '32px',
      backgroundColor: '#6F62A4',
      border: 'none',
      borderRadius: '6px',
      color: '#ffffff',
      fontSize: '13px',
      fontFamily: "'Inter', sans-serif",
      fontWeight: 500,
    };
  };
  
  const getDropdownStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: '4px',
      minWidth: '180px',
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    };
    
    if (isCyber) {
      return {
        ...base,
        backgroundColor: '#0d2f4d',
        border: '1px solid #4da6ff',
      };
    }
    
    if (isFunk) {
      return {
        ...base,
        backgroundColor: '#ffffff',
        border: '2px solid #1e1e1e',
        borderRadius: '4px',
      };
    }
    
    if (isWindows95) {
      return {
        ...base,
        backgroundColor: '#c0c0c0',
        border: '2px solid',
        borderColor: '#ffffff #808080 #808080 #ffffff',
      };
    }
    
    return {
      ...base,
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #eee',
    };
  };
  
  const getMenuItemStyle = (isLast: boolean = false): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      padding: '10px 14px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background-color 0.1s ease',
    };
    
    if (isCyber) {
      return {
        ...base,
        color: '#e8f4ff',
        fontSize: '11px',
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        borderBottom: isLast ? 'none' : '1px solid #2d7acc',
      };
    }
    
    if (isFunk) {
      return {
        ...base,
        color: '#1e1e1e',
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
        borderBottom: isLast ? 'none' : '1px solid #eee',
      };
    }
    
    if (isWindows95) {
      return {
        ...base,
        color: '#000000',
        fontSize: '11px',
        fontFamily: "'Tahoma', 'Verdana', 'Arial', sans-serif",
      };
    }
    
    return {
      ...base,
      color: '#333',
      fontSize: '13px',
      borderBottom: isLast ? 'none' : '1px solid #f0f0f0',
    };
  };
  
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && !isExporting && setIsOpen(!isOpen)}
        disabled={disabled || isExporting}
        style={getButtonStyle()}
      >
        <Download size={14} />
        <span>Export</span>
        <ChevronDown size={12} style={{ marginLeft: '2px' }} />
      </button>
      
      {isOpen && (
        <div style={getDropdownStyle()}>
          <button
            onClick={() => handleQuickExport('png')}
            style={getMenuItemStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isCyber ? 'rgba(77, 166, 255, 0.2)' : 
                isFunk ? 'rgba(255, 105, 180, 0.1)' : 
                isWindows95 ? '#000080' : 'rgba(111, 98, 164, 0.1)';
              if (isWindows95) e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (isWindows95) e.currentTarget.style.color = '#000000';
            }}
          >
            <Image size={16} />
            <span>Export as PNG</span>
          </button>
          
          <button
            onClick={() => handleQuickExport('svg')}
            style={getMenuItemStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isCyber ? 'rgba(77, 166, 255, 0.2)' : 
                isFunk ? 'rgba(255, 105, 180, 0.1)' : 
                isWindows95 ? '#000080' : 'rgba(111, 98, 164, 0.1)';
              if (isWindows95) e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (isWindows95) e.currentTarget.style.color = '#000000';
            }}
          >
            <FileCode size={16} />
            <span>Export as SVG</span>
          </button>
          
          <button
            onClick={() => handleQuickExport('pdf')}
            style={getMenuItemStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isCyber ? 'rgba(77, 166, 255, 0.2)' : 
                isFunk ? 'rgba(255, 105, 180, 0.1)' : 
                isWindows95 ? '#000080' : 'rgba(111, 98, 164, 0.1)';
              if (isWindows95) e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (isWindows95) e.currentTarget.style.color = '#000000';
            }}
          >
            <FileText size={16} />
            <span>Export as PDF</span>
          </button>
          
          <button
            onClick={() => handleQuickExport('geos')}
            style={getMenuItemStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isCyber ? 'rgba(77, 166, 255, 0.2)' : 
                isFunk ? 'rgba(255, 105, 180, 0.1)' : 
                isWindows95 ? '#000080' : 'rgba(111, 98, 164, 0.1)';
              if (isWindows95) e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (isWindows95) e.currentTarget.style.color = '#000000';
            }}
          >
            <File size={16} />
            <span>Save as GeometryOS</span>
          </button>
          
          {/* Separator */}
          <div style={{
            height: '1px',
            backgroundColor: isCyber ? '#2d7acc' : isFunk ? '#1e1e1e' : isWindows95 ? '#808080' : '#eee',
            margin: '4px 0',
          }} />
          
          {/* More Options */}
          <button
            onClick={() => {
              setIsOpen(false);
              onOpenModal?.();
            }}
            style={getMenuItemStyle(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isCyber ? 'rgba(77, 166, 255, 0.2)' : 
                isFunk ? 'rgba(255, 105, 180, 0.1)' : 
                isWindows95 ? '#000080' : 'rgba(111, 98, 164, 0.1)';
              if (isWindows95) e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              if (isWindows95) e.currentTarget.style.color = '#000000';
            }}
          >
            <span style={{ marginLeft: '26px' }}>More Options...</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportButton;

