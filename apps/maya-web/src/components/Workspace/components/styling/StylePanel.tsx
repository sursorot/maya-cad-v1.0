import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { Appearance, Shape } from '../../types';
import { FillStyleEditor } from './FillStyleEditor';
import { StrokeStyleEditor } from './StrokeStyleEditor';
import { getStyleCapabilities } from './shapeStyleCapabilities';
import type { FillStyle, StrokeStyle } from '../../types';
import './stylePanel.css';

interface StylePanelProps {
    shapes: Shape[];
    allShapes?: Shape[]; // All shapes in the workspace, used to show hidden zones
    onUpdateAppearance: (shapeId: string, appearance: Partial<Appearance>) => void;
    onDeleteSelection?: () => void;
    onZoneDisabledChange?: (zoneId: string, disabled: boolean) => void;
}

type ActivePanel = 'fill' | 'stroke' | null;

export const StylePanel: React.FC<StylePanelProps> = ({
    shapes,
    allShapes = [],
    onUpdateAppearance,
    onDeleteSelection,
    onZoneDisabledChange,
}) => {
    // Find hidden zones from all shapes
    const hiddenZones = useMemo(() => {
        return allShapes.filter(s => s.type === 'zone' && (s as import('../../types').ZoneShape).disabled);
    }, [allShapes]);
    // Start with fill panel expanded by default
    const [activePanel, setActivePanel] = useState<ActivePanel>('fill');
    const hasShapes = shapes.length > 0;
    const capabilities = useMemo(() => getStyleCapabilities(shapes), [shapes]);
    const firstShape = hasShapes ? shapes[0] : undefined;
    const currentAppearance = firstShape?.appearance || {};

    const fillEnabled = Boolean(currentAppearance.fill && currentAppearance.fill.type !== 'none');
    const strokeEnabled = Boolean(currentAppearance.stroke && currentAppearance.stroke.width !== 0);
    const strokeWidthMemory = useRef(currentAppearance.stroke?.width ?? 1);

    useEffect(() => {
        if (currentAppearance.stroke?.width && currentAppearance.stroke.width > 0) {
            strokeWidthMemory.current = currentAppearance.stroke.width;
        }
    }, [currentAppearance.stroke?.width]);

    const renderNotice = (message: string) => (
        <div className="style-inline-note" key={message}>{message}</div>
    );

    const handleFillToggle = (enabled: boolean) => {
        if (!capabilities.canEditFill) return;
        const nextFill: FillStyle = enabled
            ? (currentAppearance.fill && currentAppearance.fill.type !== 'none'
                ? currentAppearance.fill
                : { type: 'solid', color: '#E5E7EB' })
            : { type: 'none' };

        capabilities.fillShapeIds.forEach((id) => onUpdateAppearance(id, { fill: nextFill }));
    };

    const handleStrokeToggle = (enabled: boolean) => {
        if (!capabilities.canEditStroke) return;
        const baseStroke: StrokeStyle = currentAppearance.stroke || { color: '#000000', width: 1 };
        const nextStroke: StrokeStyle = enabled
            ? { ...baseStroke, width: strokeWidthMemory.current || 1 }
            : { ...baseStroke, width: 0 };

        capabilities.strokeShapeIds.forEach((id) => onUpdateAppearance(id, { stroke: nextStroke }));
    };

    const fillSummary = getFillSummary(currentAppearance.fill);
    const strokeSummary = getStrokeSummary(currentAppearance.stroke);

    if (!hasShapes) {
        return (
            <div className="style-panel__empty">
                Select a shape to edit its style
            </div>
        );
    }

    return (
        <div
            className="style-panel"
            onWheel={(event) => {
                event.stopPropagation();
            }}
        >
            <div className="style-panel__body">
            <div className="style-summary">
                <div className="style-summary__header">
                    <span>Styles</span>
                    <div className="style-summary__actions">
                        <button type="button" aria-label="Add style">+</button>
                        <button type="button" aria-label="More options">• • •</button>
                    </div>
                </div>
                <div className="style-summary__properties">
                    {capabilities.canEditFill && (
                        <StyleProperty
                            label="Fill"
                            valueLabel={fillSummary.label}
                            swatchColor={fillSummary.color}
                            enabled={fillEnabled}
                            isActive={activePanel === 'fill'}
                            onToggle={handleFillToggle}
                            onClick={() => setActivePanel(activePanel === 'fill' ? null : 'fill')}
                        />
                    )}
                    {capabilities.canEditStroke && (
                        <StyleProperty
                            label="Stroke"
                            valueLabel={strokeSummary.label}
                            swatchColor={strokeSummary.color}
                            enabled={strokeEnabled}
                            isActive={activePanel === 'stroke'}
                            onToggle={handleStrokeToggle}
                            onClick={() => setActivePanel(activePanel === 'stroke' ? null : 'stroke')}
                        />
                    )}
                </div>
            </div>

            {activePanel === 'fill' && capabilities.canEditFill && (
                <StyleEditPanel
                    title="Edit fill"
                    subtitle={`Applies to ${capabilities.fillShapeIds.length} shape${capabilities.fillShapeIds.length !== 1 ? 's' : ''}`}
                    onClose={() => setActivePanel(null)}
                >
                    <FillStyleEditor
                        value={currentAppearance.fill || { type: 'none' }}
                        onChange={(fill) => {
                            capabilities.fillShapeIds.forEach((id) => {
                                onUpdateAppearance(id, { fill });
                            });
                        }}
                    />
                    {capabilities.fillShapeIds.length !== capabilities.total && capabilities.fillShapeIds.length > 0 && (
                        renderNotice(`Applies to ${capabilities.fillShapeIds.length} of ${capabilities.total} shapes`)
                    )}
                </StyleEditPanel>
            )}

            {activePanel === 'stroke' && capabilities.canEditStroke && (
                <StyleEditPanel
                    title="Edit stroke"
                    subtitle={`Applies to ${capabilities.strokeShapeIds.length} shape${capabilities.strokeShapeIds.length !== 1 ? 's' : ''}`}
                    onClose={() => setActivePanel(null)}
                >
                    <StrokeStyleEditor
                        value={currentAppearance.stroke || { color: '#000000', width: 1 }}
                        onChange={(stroke) => {
                            capabilities.strokeShapeIds.forEach((id) => {
                                onUpdateAppearance(id, { stroke });
                            });
                        }}
                        showAdvancedControls={capabilities.showAdvancedStroke}
                    />
                    {capabilities.strokeShapeIds.length !== capabilities.total && capabilities.strokeShapeIds.length > 0 && (
                        renderNotice(`Applies to ${capabilities.strokeShapeIds.length} of ${capabilities.total} shapes`)
                    )}
                </StyleEditPanel>
            )}

            {/* Effects and presets intentionally removed */}

            {/* Zone-specific controls - Hide Zone button - Clean Theme (compact) */}
            {shapes.length === 1 && shapes[0].type === 'zone' && onZoneDisabledChange && (
                <div style={{ 
                    padding: '8px 10px', 
                    borderTop: '1px solid #e0e0e0' 
                }}>
                    <button
                        type="button"
                        onClick={() => onZoneDisabledChange(shapes[0].id, true)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            padding: '6px 8px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #000000',
                            borderRadius: 2,
                            cursor: 'pointer',
                            fontSize: '9px',
                            fontWeight: 600,
                            color: '#000000',
                            transition: 'all 0.1s ease',
                            fontFamily: "'IBM Plex Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#000000';
                            e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.color = '#000000';
                        }}
                    >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                        Hide Zone
                    </button>
                </div>
            )}

            {/* Hidden Zones List - Clean Theme (compact) */}
            {hiddenZones.length > 0 && onZoneDisabledChange && (
                <div style={{ 
                    padding: '8px 10px', 
                    borderTop: '1px solid #e0e0e0' 
                }}>
                    <div style={{
                        fontSize: '8px',
                        fontWeight: 600,
                        color: '#6c6c6c',
                        marginBottom: 6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                        Hidden ({hiddenZones.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {hiddenZones.map((zone) => (
                            <div
                                key={zone.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '4px 6px',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: 2,
                                    border: '1px solid #e0e0e0',
                                }}
                            >
                                <span style={{ 
                                    fontSize: '9px', 
                                    color: '#000000',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 100,
                                    fontFamily: "'IBM Plex Mono', monospace",
                                }}>
                                    {(zone as import('../../types').ZoneShape).label || 'Zone'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onZoneDisabledChange(zone.id, false)}
                                    style={{
                                        padding: '2px 6px',
                                        backgroundColor: '#000000',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 2,
                                        fontSize: '8px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: "'IBM Plex Mono', monospace",
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    Show
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete button - Clean Theme (compact) */}
            {onDeleteSelection && (
                <div style={{ 
                    padding: '8px 10px', 
                    borderTop: '1px solid #e0e0e0' 
                }}>
                    <button
                        type="button"
                        onClick={onDeleteSelection}
                        style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: 2,
                            fontSize: '9px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            transition: 'all 0.1s ease',
                            fontFamily: "'IBM Plex Mono', monospace",
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc2626';
                            e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.color = '#dc2626';
                        }}
                    >
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                    </button>
                </div>
            )}
            </div>
        </div>
    );
};

// Effects and preset editors removed intentionally

interface StylePropertyProps {
    label: string;
    valueLabel: string;
    swatchColor: string;
    enabled: boolean;
    isActive: boolean;
    onToggle: (enabled: boolean) => void;
    onClick: () => void;
}

const StyleProperty: React.FC<StylePropertyProps> = ({
    label,
    valueLabel,
    swatchColor,
    enabled,
    isActive,
    onToggle,
    onClick,
}) => (
    <button
        type="button"
        className={`style-property ${isActive ? 'style-property--active' : ''}`}
        onClick={onClick}
    >
        <div className="style-property__main">
            <div className="style-property__label">{label}</div>
            <div className="style-property__control">
                <span
                    className="style-property__swatch"
                    style={{ backgroundColor: swatchColor }}
                    aria-hidden
                />
                <span className="style-property__value">{valueLabel}</span>
            </div>
        </div>
        <label className="style-property__toggle" onClick={(event) => event.stopPropagation()}>
            <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => onToggle(event.target.checked)}
            />
            <span />
        </label>
    </button>
);

interface StyleEditPanelProps {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
}

const StyleEditPanel: React.FC<StyleEditPanelProps> = ({ title, subtitle, onClose, children }) => (
    <div className="style-edit-panel">
        <div className="style-edit-panel__header">
            <div>
                <div className="style-edit-panel__title">{title}</div>
                {subtitle && <div className="style-edit-panel__subtitle">{subtitle}</div>}
            </div>
            <button type="button" className="style-edit-panel__close" onClick={onClose} aria-label="Close">
                ×
            </button>
        </div>
        <div className="style-edit-panel__body">
            {children}
        </div>
    </div>
);

function getFillSummary(fill: FillStyle | undefined) {
    if (!fill || fill.type === 'none') {
        return { label: 'None', color: '#E5E7EB' };
    }
    if (fill.type === 'solid') {
        return { label: 'Solid', color: fill.color || '#E5E7EB' };
    }
    if (fill.type === 'pattern') {
        return { label: 'Pattern', color: fill.patternColors?.primary || '#6B7280' };
    }
    if (fill.type === 'gradient') {
        const firstStop = fill.gradient?.stops?.[0];
        return { label: 'Gradient', color: firstStop?.color || '#6B7280' };
    }
    return { label: fill.type, color: '#6B7280' };
}

function getStrokeSummary(stroke: StrokeStyle | undefined) {
    if (!stroke || stroke.width === 0) {
        return { label: 'Disabled', color: '#E5E7EB' };
    }
    return {
        label: `${stroke.width} px`,
        color: stroke.color || '#111827',
    };
}
