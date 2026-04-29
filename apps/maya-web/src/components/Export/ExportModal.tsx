/**
 * Export Modal Component
 * Compact export dialog with horizontal expansion for details
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  X,
  Download,
  Image,
  FileText,
  FileCode,
  File,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  Layers,
  MousePointer,
  Grid3X3,
  Ruler,
  Palette,
  ChevronRight,
  FileImage,
  Building2,
  User,
  Hash,
  Compass,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import type { WorkspaceSnapshot } from '../../domain/workspace/core/types';
import type {
  ExportFormat,
  ExportBoundingBox,
  ImageExportOptions,
  PDFExportOptions,
  PDFPageSize,
  ExportFooterOptions,
} from '../../lib/export/types';
import {
  DEFAULT_FOOTER_OPTIONS,
} from '../../lib/export/types';
import { exportService } from '../../lib/export';
import { calculateExportBounds, ensureMinimumSize } from '../../lib/export/boundingBox';

// ============================================================================
// Types
// ============================================================================

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: WorkspaceSnapshot;
  /** SVG ref, or if null, will attempt to find SVG in DOM */
  svgRef?: React.RefObject<SVGSVGElement | null> | null;
  /** Selector to find SVG element if svgRef not provided */
  svgSelector?: string;
  projectName?: string;
}

type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';
type RightPanelView = null | 'advanced' | 'footer';

interface FormatOption {
  id: ExportFormat;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  category: 'image' | 'document' | 'cad' | 'native';
}

// ============================================================================
// Format Options
// ============================================================================

const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'png', name: 'PNG Image', shortName: 'PNG', icon: <FileImage size={18} />, category: 'image' },
  { id: 'jpeg', name: 'JPEG Image', shortName: 'JPEG', icon: <Image size={18} />, category: 'image' },
  { id: 'svg', name: 'SVG Vector', shortName: 'SVG', icon: <FileCode size={18} />, category: 'image' },
  { id: 'pdf', name: 'PDF Document', shortName: 'PDF', icon: <FileText size={18} />, category: 'document' },
  { id: 'dxf', name: 'DXF (CAD)', shortName: 'DXF', icon: <FileCode size={18} />, category: 'cad' },
  { id: 'geos', name: 'GeometryOS', shortName: 'GEOS', icon: <File size={18} />, category: 'native' },
];

// ============================================================================
// Component
// ============================================================================

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  svgRef,
  svgSelector = '.workspace-canvas svg',
  projectName,
}) => {
  // Helper to get SVG element
  const getSvgElement = useCallback((): SVGSVGElement | null => {
    if (svgRef?.current) return svgRef.current;
    const svgElement = document.querySelector(svgSelector);
    return svgElement as SVGSVGElement | null;
  }, [svgRef, svgSelector]);
  
  // State
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png');
  const [scope, setScope] = useState<'all' | 'selection'>('all');
  const [padding, setPadding] = useState(0.5);
  const [includeGrid, setIncludeGrid] = useState(false);
  const [includeMeasurements, setIncludeMeasurements] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [transparentBg, setTransparentBg] = useState(false);
  
  // Image options
  const [imageScale, setImageScale] = useState<1 | 2 | 3 | 4>(2);
  const [jpegQuality, setJpegQuality] = useState(0.9);
  
  // PDF options
  const [pdfPageSize, setPdfPageSize] = useState<PDFPageSize>('a4');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [pdfMargin, setPdfMargin] = useState(10);
  
  // DXF BIM options
  const [dxfUseAIALayers, setDxfUseAIALayers] = useState(true);
  const [dxfIncludeBIMData, setDxfIncludeBIMData] = useState(true);
  const [dxfUseBlockRefs, setDxfUseBlockRefs] = useState(true);
  const [dxfIncludeArchDimStyles, setDxfIncludeArchDimStyles] = useState(true);
  
  // Footer options
  const [footerOptions, setFooterOptions] = useState<ExportFooterOptions>(() => ({
    ...DEFAULT_FOOTER_OPTIONS,
    projectName: projectName || '',
    date: new Date().toLocaleDateString('en-GB'),
  }));
  
  // Export state
  const [status, setStatus] = useState<ExportStatus>('idle');
  const [_errorMessage, setErrorMessage] = useState('');
  const [rightPanel, setRightPanel] = useState<RightPanelView>(null);
  
  // Helper to update footer options
  const updateFooterOption = <K extends keyof ExportFooterOptions>(
    key: K,
    value: ExportFooterOptions[K]
  ) => {
    setFooterOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const updateCompanyOption = (
    key: keyof NonNullable<ExportFooterOptions['company']>,
    value: string
  ) => {
    setFooterOptions(prev => ({
      ...prev,
      company: { ...prev.company, [key]: value } as NonNullable<ExportFooterOptions['company']>,
    }));
  };
  
  // Computed values
  const hasSelection = snapshot.selectedShapeIds.length > 0;
  const effectiveScope = hasSelection ? scope : 'all';
  const showFooterOption = ['png', 'jpeg', 'svg', 'pdf'].includes(selectedFormat);
  
  // Calculate preview bounds
  const bounds = useMemo((): ExportBoundingBox => {
    const calculatedBounds = calculateExportBounds(
      snapshot.shapes,
      snapshot.selectedShapeIds,
      effectiveScope,
      padding,
      { includeGuidelines: false }
    );
    return ensureMinimumSize(calculatedBounds);
  }, [snapshot.shapes, snapshot.selectedShapeIds, effectiveScope, padding]);
  
  // Get shape count for scope
  const shapeCount = useMemo(() => {
    if (effectiveScope === 'selection') {
      return snapshot.selectedShapeIds.length;
    }
    return snapshot.shapes.filter(s => s.type !== 'guideline').length;
  }, [snapshot.shapes, snapshot.selectedShapeIds, effectiveScope]);
  
  // Handle export
  const handleExport = useCallback(async () => {
    const svgElement = getSvgElement();
    
    if (!svgElement && selectedFormat !== 'dxf' && selectedFormat !== 'geos') {
      setStatus('error');
      setErrorMessage('Canvas not available');
      return;
    }
    
    setStatus('exporting');
    setErrorMessage('');
    
    const baseOptions = {
      scope: effectiveScope,
      padding,
      includeGrid,
      includeMeasurements,
      includeGuidelines: false,
      backgroundColor: transparentBg ? 'transparent' : backgroundColor,
      fileName: projectName || 'maya-export',
      footer: footerOptions,
    };
    
    try {
      let result;
      
      switch (selectedFormat) {
        case 'png':
        case 'jpeg':
        case 'svg':
          result = await exportService.exportAndDownload(
            selectedFormat,
            svgElement,
            snapshot,
            snapshot.selectedShapeIds,
            {
              ...baseOptions,
              format: selectedFormat,
              scale: imageScale,
              jpegQuality: selectedFormat === 'jpeg' ? jpegQuality : undefined,
            } as Partial<ImageExportOptions>
          );
          break;
          
        case 'pdf':
          result = await exportService.exportAndDownload(
            'pdf',
            svgElement,
            snapshot,
            snapshot.selectedShapeIds,
            {
              ...baseOptions,
              format: 'pdf',
              pageSize: pdfPageSize,
              orientation: pdfOrientation,
              margin: pdfMargin,
              includeMetadata: true,
              title: projectName,
            } as Partial<PDFExportOptions>
          );
          break;
          
        case 'dxf':
          result = await exportService.exportAndDownload(
            'dxf',
            null,
            snapshot,
            snapshot.selectedShapeIds,
            {
              ...baseOptions,
              format: 'dxf',
              version: 'R12', // R12 for maximum compatibility with AutoCAD and other CAD software
              units: 'm',
              // BIM Enhancement Options
              useAIALayers: dxfUseAIALayers,
              includeBIMData: dxfIncludeBIMData,
              useBlockReferences: dxfUseBlockRefs,
              includeArchDimStyles: dxfIncludeArchDimStyles,
              projectMetadata: {
                projectName: projectName || footerOptions.projectName,
                projectNumber: footerOptions.projectNumber,
                author: footerOptions.madeBy,
                company: footerOptions.company?.name,
              },
            }
          );
          break;
          
        case 'geos':
          result = await exportService.exportAndDownload(
            'geos',
            null,
            snapshot,
            snapshot.selectedShapeIds,
            {
              ...baseOptions,
              format: 'geos',
              includeViewport: true,
              includeSettings: true,
            }
          );
          break;
          
        default:
          throw new Error(`Unsupported format: ${selectedFormat}`);
      }
      
      if (result.success) {
        setStatus('success');
        setTimeout(() => {
          setStatus('idle');
          onClose();
        }, 1500);
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'Export failed');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Export failed');
    }
  }, [
    getSvgElement,
    selectedFormat,
    effectiveScope,
    padding,
    includeGrid,
    includeMeasurements,
    transparentBg,
    backgroundColor,
    projectName,
    snapshot,
    imageScale,
    jpegQuality,
    pdfPageSize,
    pdfOrientation,
    pdfMargin,
    footerOptions,
    onClose,
  ]);
  
  if (!isOpen) return null;
  
  const selectedFormatInfo = FORMAT_OPTIONS.find(f => f.id === selectedFormat);
  
  return (
    <div className="export-modal-overlay" style={overlayStyle}>
      <div className="export-modal" style={{ ...modalStyle, width: rightPanel ? '720px' : '360px' }}>
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Main Panel (Left) */}
          <div style={mainPanelStyle}>
            {/* Header */}
            <div style={headerStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} style={{ color: '#ffffff' }} />
                <span style={{ fontWeight: 600, fontSize: '11px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Export</span>
              </div>
              <button onClick={onClose} style={closeButtonStyle}>
                <X size={16} />
              </button>
            </div>
            
            {/* Format Selection - Compact Grid */}
            <div style={sectionStyle}>
              <div style={formatGridStyle}>
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    title={format.name}
                    style={{
                      ...formatPillStyle,
                      ...(selectedFormat === format.id ? formatPillSelectedStyle : {}),
                    }}
                  >
                    <span style={{ color: selectedFormat === format.id ? '#ffffff' : '#6c6c6c' }}>
                      {format.icon}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 500 }}>{format.shortName}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Scope - Icon Buttons */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setScope('all')}
                  title={`All Shapes (${snapshot.shapes.filter(s => s.type !== 'guideline').length})`}
                  style={{
                    ...scopeIconStyle,
                    ...(effectiveScope === 'all' ? scopeIconSelectedStyle : {}),
                  }}
                >
                  <Layers size={16} />
                  <span>All ({snapshot.shapes.filter(s => s.type !== 'guideline').length})</span>
                </button>
                <button
                  onClick={() => setScope('selection')}
                  disabled={!hasSelection}
                  title={hasSelection ? `Selection (${snapshot.selectedShapeIds.length})` : 'No selection'}
                  style={{
                    ...scopeIconStyle,
                    ...(effectiveScope === 'selection' ? scopeIconSelectedStyle : {}),
                    ...(!hasSelection ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                  }}
                >
                  <MousePointer size={16} />
                  <span>Selected ({hasSelection ? snapshot.selectedShapeIds.length : 0})</span>
                </button>
              </div>
            </div>
            
            {/* Quick Options - Compact */}
            <div style={sectionStyle}>
              <div style={quickOptionsGrid}>
                <label style={iconCheckboxStyle} title="Include measurements">
                  <input
                    type="checkbox"
                    checked={includeMeasurements}
                    onChange={(e) => setIncludeMeasurements(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    ...iconCheckboxBoxStyle,
                    ...(includeMeasurements ? iconCheckboxCheckedStyle : {}),
                  }}>
                    <Ruler size={14} />
                  </div>
                  <span>Dims</span>
                </label>
                
                <label style={iconCheckboxStyle} title="Include grid">
                  <input
                    type="checkbox"
                    checked={includeGrid}
                    onChange={(e) => setIncludeGrid(e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div style={{
                    ...iconCheckboxBoxStyle,
                    ...(includeGrid ? iconCheckboxCheckedStyle : {}),
                  }}>
                    <Grid3X3 size={14} />
                  </div>
                  <span>Grid</span>
                </label>
                
                {(selectedFormat === 'png' || selectedFormat === 'svg') && (
                  <label style={iconCheckboxStyle} title="Transparent background">
                    <input
                      type="checkbox"
                      checked={transparentBg}
                      onChange={(e) => setTransparentBg(e.target.checked)}
                      style={{ display: 'none' }}
                    />
                    <div style={{
                      ...iconCheckboxBoxStyle,
                      ...(transparentBg ? iconCheckboxCheckedStyle : {}),
                    }}>
                      <Palette size={14} />
                    </div>
                    <span>Trans</span>
                  </label>
                )}
              </div>
            </div>
            
            {/* Expand Buttons */}
            <div style={expandButtonsStyle}>
              <button
                onClick={() => setRightPanel(rightPanel === 'advanced' ? null : 'advanced')}
                style={{
                  ...expandBtnStyle,
                  ...(rightPanel === 'advanced' ? expandBtnActiveStyle : {}),
                }}
              >
                <Settings size={14} />
                <span>Options</span>
                <ChevronRight size={14} style={{ 
                  marginLeft: 'auto', 
                  transform: rightPanel === 'advanced' ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.15s ease',
                }} />
              </button>
              
              {showFooterOption && (
                <button
                  onClick={() => setRightPanel(rightPanel === 'footer' ? null : 'footer')}
                  style={{
                    ...expandBtnStyle,
                    ...(rightPanel === 'footer' ? expandBtnActiveStyle : {}),
                  }}
                >
                  <FileText size={14} />
                  <span>Footer</span>
                  {footerOptions.enabled && (
                    <span style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      backgroundColor: '#000000',
                    }} />
                  )}
                  <ChevronRight size={14} style={{ 
                    marginLeft: 'auto', 
                    transform: rightPanel === 'footer' ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.15s ease',
                  }} />
                </button>
              )}
            </div>
            
            {/* Preview Info */}
            <div style={previewInfoStyle}>
              <span>{bounds.width.toFixed(1)}m × {bounds.height.toFixed(1)}m</span>
              <span style={{ color: '#999' }}>•</span>
              <span>{shapeCount} shapes</span>
            </div>
            
            {/* Footer with Export Button */}
            <div style={footerActionsStyle}>
              {status === 'error' && (
                <div style={statusMiniStyle}>
                  <AlertCircle size={14} color="#dc2626" />
                </div>
              )}
              {status === 'success' && (
                <div style={statusMiniStyle}>
                  <CheckCircle size={14} color="#16a34a" />
                </div>
              )}
              
              <button
                onClick={handleExport}
                disabled={status === 'exporting'}
                style={{
                  ...exportButtonStyle,
                  ...(status === 'exporting' ? { opacity: 0.7, cursor: 'wait' } : {}),
                }}
              >
                {status === 'exporting' ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Download size={16} />
                )}
                <span>{status === 'exporting' ? 'Exporting...' : `Export ${selectedFormatInfo?.shortName}`}</span>
              </button>
            </div>
          </div>
          
          {/* Right Panel - Advanced / Footer */}
          {rightPanel && (
            <div style={rightPanelStyle}>
              {rightPanel === 'advanced' && (
                <>
                  <h3 style={rightPanelTitle}>
                    <Settings size={14} />
                    Advanced Options
                  </h3>
                  
                  {/* Format-specific options */}
                  {(selectedFormat === 'png' || selectedFormat === 'jpeg' || selectedFormat === 'svg') && (
                    <div style={optionGroupStyle}>
                      <div style={optionRowCompact}>
                        <label>Resolution</label>
                        <select
                          value={imageScale}
                          onChange={(e) => setImageScale(parseInt(e.target.value) as 1 | 2 | 3 | 4)}
                          style={selectCompact}
                        >
                          <option value={1}>1x Standard</option>
                          <option value={2}>2x High</option>
                          <option value={3}>3x Very High</option>
                          <option value={4}>4x Maximum</option>
                        </select>
                      </div>
                      
                      {selectedFormat === 'jpeg' && (
                        <div style={optionRowCompact}>
                          <label>Quality</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="range"
                              min="0.5"
                              max="1"
                              step="0.05"
                              value={jpegQuality}
                              onChange={(e) => setJpegQuality(parseFloat(e.target.value))}
                              style={{ width: '80px' }}
                            />
                            <span style={{ fontSize: '11px', width: '32px' }}>
                              {Math.round(jpegQuality * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedFormat === 'pdf' && (
                    <div style={optionGroupStyle}>
                      <div style={optionRowCompact}>
                        <label>Page Size</label>
                        <select
                          value={pdfPageSize}
                          onChange={(e) => setPdfPageSize(e.target.value as PDFPageSize)}
                          style={selectCompact}
                        >
                          <option value="a4">A4</option>
                          <option value="a3">A3</option>
                          <option value="a2">A2</option>
                          <option value="a1">A1</option>
                          <option value="letter">Letter</option>
                          <option value="tabloid">Tabloid</option>
                        </select>
                      </div>
                      
                      <div style={optionRowCompact}>
                        <label>Orientation</label>
                        <select
                          value={pdfOrientation}
                          onChange={(e) => setPdfOrientation(e.target.value as 'portrait' | 'landscape')}
                          style={selectCompact}
                        >
                          <option value="landscape">Landscape</option>
                          <option value="portrait">Portrait</option>
                        </select>
                      </div>
                      
                      <div style={optionRowCompact}>
                        <label>Margin</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={pdfMargin}
                            onChange={(e) => setPdfMargin(parseInt(e.target.value) || 10)}
                            style={{ ...selectCompact, width: '60px' }}
                          />
                          <span style={{ fontSize: '11px', color: '#888' }}>mm</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* DXF BIM Options */}
                  {selectedFormat === 'dxf' && (
                    <div style={optionGroupStyle}>
                      <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '8px', color: '#555' }}>
                        BIM Export Options
                      </div>
                      
                      <div style={optionRowCompact}>
                        <label>AIA Layers</label>
                        <button
                          onClick={() => setDxfUseAIALayers(!dxfUseAIALayers)}
                          style={{
                            ...toggleStyle,
                            backgroundColor: dxfUseAIALayers ? '#000000' : '#e0e0e0',
                          }}
                        >
                          <div style={{
                            ...toggleKnobStyle,
                            left: dxfUseAIALayers ? '18px' : '2px',
                            backgroundColor: dxfUseAIALayers ? '#ffffff' : '#000000',
                          }} />
                        </button>
                      </div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '-4px', marginBottom: '8px' }}>
                        Use AIA CAD Layer Guidelines compliant layer names
                      </div>
                      
                      <div style={optionRowCompact}>
                        <label>BIM Data (XDATA)</label>
                        <button
                          onClick={() => setDxfIncludeBIMData(!dxfIncludeBIMData)}
                          style={{
                            ...toggleStyle,
                            backgroundColor: dxfIncludeBIMData ? '#000000' : '#e0e0e0',
                          }}
                        >
                          <div style={{
                            ...toggleKnobStyle,
                            left: dxfIncludeBIMData ? '18px' : '2px',
                            backgroundColor: dxfIncludeBIMData ? '#ffffff' : '#000000',
                          }} />
                        </button>
                      </div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '-4px', marginBottom: '8px' }}>
                        Include GlobalId, classifications, and properties as XDATA
                      </div>
                      
                      <div style={optionRowCompact}>
                        <label>Door/Window Blocks</label>
                        <button
                          onClick={() => setDxfUseBlockRefs(!dxfUseBlockRefs)}
                          style={{
                            ...toggleStyle,
                            backgroundColor: dxfUseBlockRefs ? '#000000' : '#e0e0e0',
                          }}
                        >
                          <div style={{
                            ...toggleKnobStyle,
                            left: dxfUseBlockRefs ? '18px' : '2px',
                            backgroundColor: dxfUseBlockRefs ? '#ffffff' : '#000000',
                          }} />
                        </button>
                      </div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '-4px', marginBottom: '8px' }}>
                        Export openings as block references with swing/slide arcs
                      </div>
                      
                      <div style={optionRowCompact}>
                        <label>Arch Dim Styles</label>
                        <button
                          onClick={() => setDxfIncludeArchDimStyles(!dxfIncludeArchDimStyles)}
                          style={{
                            ...toggleStyle,
                            backgroundColor: dxfIncludeArchDimStyles ? '#000000' : '#e0e0e0',
                          }}
                        >
                          <div style={{
                            ...toggleKnobStyle,
                            left: dxfIncludeArchDimStyles ? '18px' : '2px',
                            backgroundColor: dxfIncludeArchDimStyles ? '#ffffff' : '#000000',
                          }} />
                        </button>
                      </div>
                      <div style={{ fontSize: '10px', color: '#888', marginTop: '-4px' }}>
                        Include architectural dimension styles (MAYA_ARCH)
                      </div>
                    </div>
                  )}
                  
                  {/* Common options */}
                  <div style={optionGroupStyle}>
                    <div style={optionRowCompact}>
                      <label>Padding</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={padding}
                          onChange={(e) => setPadding(parseFloat(e.target.value))}
                          style={{ width: '80px' }}
                        />
                        <span style={{ fontSize: '11px', width: '32px' }}>
                          {padding.toFixed(1)}m
                        </span>
                      </div>
                    </div>
                    
                    {!transparentBg && selectedFormat !== 'geos' && (
                      <div style={optionRowCompact}>
                        <label>Background</label>
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          style={colorInputStyle}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {rightPanel === 'footer' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ ...rightPanelTitle, marginBottom: 0 }}>
                      <FileText size={14} />
                      Export Footer
                    </h3>
                    <button
                      onClick={() => updateFooterOption('enabled', !footerOptions.enabled)}
                      style={{
                        ...toggleStyle,
                        backgroundColor: footerOptions.enabled ? '#000000' : '#e0e0e0',
                      }}
                    >
                      <div style={{
                        ...toggleKnobStyle,
                        left: footerOptions.enabled ? '18px' : '2px',
                        backgroundColor: footerOptions.enabled ? '#ffffff' : '#000000',
                      }} />
                    </button>
                  </div>
                  
                  {footerOptions.enabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Page Info */}
                      <div style={footerSectionStyle}>
                        <div style={footerSectionHeader}>
                          <Hash size={12} />
                          <span>Page Info</span>
                        </div>
                        <div style={footerFieldsGrid}>
                          <div>
                            <label style={footerLabel}>Page ID</label>
                            <input
                              type="text"
                              value={footerOptions.pageId || ''}
                              onChange={(e) => updateFooterOption('pageId', e.target.value)}
                              placeholder="A01"
                              style={footerInput}
                            />
                          </div>
                          <div>
                            <label style={footerLabel}>Date</label>
                            <input
                              type="text"
                              value={footerOptions.date || ''}
                              onChange={(e) => updateFooterOption('date', e.target.value)}
                              placeholder="01/01/2024"
                              style={footerInput}
                            />
                          </div>
                          <div>
                            <label style={footerLabel}>Title</label>
                            <input
                              type="text"
                              value={footerOptions.title || ''}
                              onChange={(e) => updateFooterOption('title', e.target.value)}
                              placeholder="Floor Plan"
                              style={footerInput}
                            />
                          </div>
                          <div>
                            <label style={footerLabel}>Subtitle</label>
                            <input
                              type="text"
                              value={footerOptions.subtitle || ''}
                              onChange={(e) => updateFooterOption('subtitle', e.target.value)}
                              placeholder="Ground Floor"
                              style={footerInput}
                            />
                          </div>
                        </div>
                        <label style={miniCheckboxStyle}>
                          <input
                            type="checkbox"
                            checked={footerOptions.showNorthSymbol}
                            onChange={(e) => updateFooterOption('showNorthSymbol', e.target.checked)}
                          />
                          <Compass size={12} />
                          <span>North symbol</span>
                        </label>
                      </div>
                      
                      {/* Project Info */}
                      <div style={footerSectionStyle}>
                        <div style={footerSectionHeader}>
                          <Building2 size={12} />
                          <span>Project</span>
                        </div>
                        <div style={footerFieldsGrid}>
                          <div>
                            <label style={footerLabel}>Name</label>
                            <input
                              type="text"
                              value={footerOptions.projectName || ''}
                              onChange={(e) => updateFooterOption('projectName', e.target.value)}
                              placeholder="My Project"
                              style={footerInput}
                            />
                          </div>
                          <div>
                            <label style={footerLabel}>Number</label>
                            <input
                              type="text"
                              value={footerOptions.projectNumber || ''}
                              onChange={(e) => updateFooterOption('projectNumber', e.target.value)}
                              placeholder="P001"
                              style={footerInput}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={footerLabel}>Made By</label>
                            <input
                              type="text"
                              value={footerOptions.madeBy || ''}
                              onChange={(e) => updateFooterOption('madeBy', e.target.value)}
                              placeholder="Your Name"
                              style={footerInput}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Company Info */}
                      <div style={footerSectionStyle}>
                        <div style={footerSectionHeader}>
                          <User size={12} />
                          <span>Company</span>
                        </div>
                        <div style={footerFieldsGrid}>
                          <div>
                            <label style={footerLabel}>Name</label>
                            <input
                              type="text"
                              value={footerOptions.company?.name || ''}
                              onChange={(e) => updateCompanyOption('name', e.target.value)}
                              placeholder="Company"
                              style={footerInput}
                            />
                          </div>
                          <div>
                            <label style={footerLabel}>Tagline</label>
                            <input
                              type="text"
                              value={footerOptions.company?.tagline || ''}
                              onChange={(e) => updateCompanyOption('tagline', e.target.value)}
                              placeholder="Tagline"
                              style={footerInput}
                            />
                          </div>
                          <div>
                            <label style={footerLabel}>
                              <Phone size={10} style={{ marginRight: '4px' }} />
                              Phone
                            </label>
                            <input
                              type="text"
                              value={footerOptions.company?.phone || ''}
                              onChange={(e) => updateCompanyOption('phone', e.target.value)}
                              placeholder="+1 234 567"
                              style={footerInput}
                            />
                          </div>
                          <div>
                            <label style={footerLabel}>
                              <Mail size={10} style={{ marginRight: '4px' }} />
                              Email
                            </label>
                            <input
                              type="text"
                              value={footerOptions.company?.email || ''}
                              onChange={(e) => updateCompanyOption('email', e.target.value)}
                              placeholder="email@co.com"
                              style={footerInput}
                            />
                          </div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <label style={footerLabel}>
                              <MapPin size={10} style={{ marginRight: '4px' }} />
                              Location
                            </label>
                            <input
                              type="text"
                              value={footerOptions.company?.location || ''}
                              onChange={(e) => updateCompanyOption('location', e.target.value)}
                              placeholder="City, Country"
                              style={footerInput}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Styles - Clean Theme
// ============================================================================

const overlayStyle: React.CSSProperties = {
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
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '4px',
  border: '2px solid #000000',
  boxShadow: 'none',
  maxHeight: '80vh',
  overflow: 'hidden',
  transition: 'width 0.2s ease',
  fontFamily: "'IBM Plex Mono', monospace",
};

const mainPanelStyle: React.CSSProperties = {
  width: '360px',
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #e0e0e0',
};

const rightPanelStyle: React.CSSProperties = {
  width: '360px',
  padding: '16px',
  overflowY: 'auto',
  backgroundColor: '#fafafa',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #e0e0e0',
  backgroundColor: '#000000',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px',
  color: '#ffffff',
  borderRadius: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.7,
};

const sectionStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #e0e0e0',
};

const formatGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, 1fr)',
  gap: '6px',
};

const formatPillStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  padding: '8px 4px',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  backgroundColor: '#fff',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  fontFamily: "'IBM Plex Mono', monospace",
};

const formatPillSelectedStyle: React.CSSProperties = {
  borderColor: '#000000',
  backgroundColor: '#000000',
  color: '#ffffff',
};

const scopeIconStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  padding: '8px 12px',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontSize: '11px',
  color: '#6c6c6c',
  transition: 'all 0.15s ease',
  fontFamily: "'IBM Plex Mono', monospace",
};

const scopeIconSelectedStyle: React.CSSProperties = {
  borderColor: '#000000',
  backgroundColor: '#000000',
  color: '#ffffff',
};

const quickOptionsGrid: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
};

const iconCheckboxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '4px',
  cursor: 'pointer',
  fontSize: '9px',
  color: '#6c6c6c',
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const iconCheckboxBoxStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid #e0e0e0',
  borderRadius: '4px',
  backgroundColor: '#fff',
  color: '#6c6c6c',
  transition: 'all 0.15s ease',
};

const iconCheckboxCheckedStyle: React.CSSProperties = {
  borderColor: '#000000',
  backgroundColor: '#000000',
  color: '#ffffff',
};

const expandButtonsStyle: React.CSSProperties = {
  padding: '8px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const expandBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  border: '1px solid transparent',
  borderRadius: '4px',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  fontSize: '11px',
  color: '#6c6c6c',
  transition: 'all 0.15s ease',
  fontFamily: "'IBM Plex Mono', monospace",
};

const expandBtnActiveStyle: React.CSSProperties = {
  backgroundColor: '#f5f5f5',
  borderColor: '#e0e0e0',
  color: '#000000',
};

const previewInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '8px 16px',
  fontSize: '10px',
  color: '#6c6c6c',
  backgroundColor: '#f5f5f5',
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const footerActionsStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 16px',
  borderTop: '1px solid #e0e0e0',
  marginTop: 'auto',
};

const statusMiniStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
};

const exportButtonStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 16px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: '#000000',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  transition: 'opacity 0.15s ease',
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

// Right panel styles
const rightPanelTitle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  margin: '0 0 16px 0',
  fontSize: '11px',
  fontWeight: 600,
  color: '#000000',
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const optionGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '12px',
  backgroundColor: '#fff',
  borderRadius: '4px',
  marginBottom: '12px',
  border: '1px solid #e0e0e0',
};

const optionRowCompact: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '11px',
  color: '#000000',
  fontFamily: "'IBM Plex Mono', monospace",
};

const selectCompact: React.CSSProperties = {
  padding: '5px 8px',
  borderRadius: '4px',
  border: '1px solid #000000',
  fontSize: '11px',
  backgroundColor: '#fff',
  fontFamily: "'IBM Plex Mono', monospace",
};

const colorInputStyle: React.CSSProperties = {
  width: '32px',
  height: '24px',
  border: '1px solid #000000',
  borderRadius: '4px',
  cursor: 'pointer',
};

const toggleStyle: React.CSSProperties = {
  width: '36px',
  height: '20px',
  borderRadius: '10px',
  position: 'relative',
  border: '1px solid #000000',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
};

const toggleKnobStyle: React.CSSProperties = {
  width: '14px',
  height: '14px',
  backgroundColor: '#000000',
  borderRadius: '50%',
  position: 'absolute',
  top: '2px',
  transition: 'left 0.2s ease',
  boxShadow: 'none',
};

const footerSectionStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: '4px',
  padding: '12px',
  border: '1px solid #e0e0e0',
};

const footerSectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '10px',
  fontWeight: 600,
  color: '#6c6c6c',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '10px',
  fontFamily: "'IBM Plex Mono', monospace",
};

const footerFieldsGrid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '8px',
};

const footerLabel: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '9px',
  color: '#6c6c6c',
  marginBottom: '3px',
  fontFamily: "'IBM Plex Mono', monospace",
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const footerInput: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: '4px',
  border: '1px solid #e0e0e0',
  fontSize: '11px',
  backgroundColor: '#fff',
  boxSizing: 'border-box',
  fontFamily: "'IBM Plex Mono', monospace",
};

const miniCheckboxStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '10px',
  color: '#000000',
  marginTop: '8px',
  cursor: 'pointer',
  fontFamily: "'IBM Plex Mono', monospace",
};

export default ExportModal;
