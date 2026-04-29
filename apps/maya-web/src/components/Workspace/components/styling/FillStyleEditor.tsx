import React, { useState } from 'react';
import type { FillStyle } from '../../types';
import { ColorPicker } from './ColorPicker';
import { PATTERN_CATALOG, PatternPreviewSVG } from '../Canvas/PatternDefinitions';

interface FillStyleEditorProps {
    value: FillStyle;
    onChange: (fill: FillStyle) => void;
}

// Icons for fill type tabs - Clean Theme style
const SolidIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" fill={active ? '#000000' : '#c0c0c0'} />
    </svg>
);

const GradientIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <defs>
            <linearGradient id={`grad-icon-${active ? 'active' : 'inactive'}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={active ? '#c0c0c0' : '#e0e0e0'} />
                <stop offset="100%" stopColor={active ? '#000000' : '#808080'} />
            </linearGradient>
        </defs>
        <rect x="4" y="4" width="16" height="16" rx="2" fill={`url(#grad-icon-${active ? 'active' : 'inactive'})`} />
    </svg>
);

const PatternIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#000000' : '#c0c0c0'} strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" />
        <line x1="4" y1="10" x2="20" y2="10" />
        <line x1="4" y1="16" x2="20" y2="16" />
        <line x1="10" y1="4" x2="10" y2="20" />
        <line x1="16" y1="4" x2="16" y2="20" />
    </svg>
);

const ImageIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#000000' : '#c0c0c0'} strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" />
        <circle cx="9" cy="9" r="2" fill={active ? '#000000' : '#c0c0c0'} stroke="none" />
        <path d="M4 16l4-4 3 3 5-5 4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const NoneIcon = ({ active }: { active: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#000000' : '#c0c0c0'} strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="none" strokeDasharray="3 2" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const FILL_TYPE_TABS: Array<{ value: FillStyle['type']; label: string; Icon: React.FC<{ active: boolean }> }> = [
    { value: 'solid', label: 'Solid', Icon: SolidIcon },
    { value: 'gradient', label: 'Gradient', Icon: GradientIcon },
    { value: 'pattern', label: 'Pattern', Icon: PatternIcon },
    { value: 'image', label: 'Image', Icon: ImageIcon },
    { value: 'none', label: 'None', Icon: NoneIcon },
];

// Group patterns by category
const PATTERN_CATEGORIES = [
    { key: 'tiles', label: 'Tiles & Masonry' },
    { key: 'lines', label: 'Lines & Hatching' },
    { key: 'shapes', label: 'Shapes & Geometric' },
    { key: 'nature', label: 'Nature & Landscape' },
    { key: 'decorative', label: 'Decorative' },
    { key: 'wood', label: 'Wood & Flooring' },
] as const;

// Shared styles - Clean Theme
const styles: Record<string, React.CSSProperties> = {
    label: {
        fontSize: '9px',
        fontWeight: 600,
        color: '#6c6c6c',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
        display: 'block',
    },
    select: {
        width: '100%',
        padding: '6px 8px',
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: 3,
        color: '#000000',
        fontSize: '10px',
        fontFamily: "'IBM Plex Mono', monospace",
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '9px',
        color: '#6c6c6c',
    },
    value: {
        fontSize: '9px',
        color: '#000000',
        minWidth: 28,
        textAlign: 'right' as const,
    },
};

export const FillStyleEditor: React.FC<FillStyleEditorProps> = ({ value, onChange }) => {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const handleTypeChange = (newType: FillStyle['type']) => {
        const newFill: FillStyle = { type: newType };

        if (newType === 'solid') {
            newFill.color = value.color || '#E5E7EB';
            newFill.opacity = value.opacity ?? 1;
        } else if (newType === 'pattern') {
            newFill.patternId = value.patternId || 'oblique-compact';
            newFill.patternColors = value.patternColors || { primary: '#000000' };
            newFill.patternScale = value.patternScale ?? 1;
            newFill.opacity = value.opacity ?? 1;
        } else if (newType === 'gradient') {
            newFill.gradient = value.gradient || {
                type: 'linear',
                stops: [
                    { offset: 0, color: '#c0c0c0' },
                    { offset: 1, color: '#000000' },
                ],
                angle: 135,
            };
            newFill.opacity = value.opacity ?? 1;
        }

        onChange(newFill);
    };

    const handlePatternSelect = (patternId: string) => {
        onChange({
            ...value,
            patternId,
        });
    };

    const currentPatternColor = value.patternColors?.primary || '#000000';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Fill Type Tab Icons - Clean Theme */}
            <div style={{ 
                display: 'flex', 
                gap: 2,
                padding: '2px',
                background: '#f5f5f5',
                borderRadius: 3,
                border: '1px solid #e0e0e0',
            }}>
                {FILL_TYPE_TABS.map(({ value: typeValue, label, Icon }) => {
                    const isActive = value.type === typeValue;
                    return (
                        <button
                            key={typeValue}
                            type="button"
                            onClick={() => handleTypeChange(typeValue)}
                            title={label}
                    style={{
                                flex: 1,
                                padding: '6px 4px',
                                border: isActive ? '1px solid #000000' : '1px solid transparent',
                                borderRadius: 2,
                                background: isActive ? '#ffffff' : 'transparent',
                        cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.1s ease',
                            }}
                        >
                            <Icon active={isActive} />
                        </button>
                    );
                })}
            </div>

            {/* Solid Color Options */}
            {value.type === 'solid' && (
                <>
                    <ColorPicker
                        label="Color"
                        value={value.color || '#E5E7EB'}
                        onChange={(color) => onChange({ ...value, color })}
                    />

                    {/* Opacity */}
                    <div style={styles.row}>
                        <span style={{ minWidth: 42 }}>Opacity</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round((value.opacity ?? 1) * 100)}
                            onChange={(e) => onChange({ ...value, opacity: parseInt(e.target.value) / 100 })}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                '--slider-progress': `${Math.round((value.opacity ?? 1) * 100)}%`
                            } as React.CSSProperties}
                        />
                        <span style={styles.value}>{Math.round((value.opacity ?? 1) * 100)}%</span>
                    </div>
                </>
            )}

            {/* Pattern Options */}
            {value.type === 'pattern' && (
                <>
                    {/* Pattern Preview */}
                    <div style={{
                        width: '100%',
                        height: 60,
                        border: '1px solid #e0e0e0',
                        borderRadius: 3,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f5f5',
                    }}>
                        <PatternPreviewSVG 
                            patternId={value.patternId || 'oblique-compact'} 
                            color={currentPatternColor}
                            size={60}
                        />
                    </div>

                    {/* Pattern Selector */}
                    <div>
                        <label style={styles.label}>Pattern</label>
                        <div style={{ 
                            maxHeight: 140,
                            overflowY: 'auto',
                            border: '1px solid #e0e0e0',
                            borderRadius: 3,
                        }}>
                            {PATTERN_CATEGORIES.map(({ key, label }) => {
                                const categoryPatterns = PATTERN_CATALOG.filter(p => p.category === key);
                                const isExpanded = expandedCategory === key;
                                
                                return (
                                    <div key={key} style={{ borderBottom: '1px solid #e0e0e0' }}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedCategory(isExpanded ? null : key)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                background: '#f5f5f5',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '9px',
                                                fontWeight: 500,
                                                color: '#6c6c6c',
                                                fontFamily: "'IBM Plex Mono', monospace",
                                            }}
                                        >
                                            <span>{label}</span>
                                            <span style={{ 
                                                fontSize: '10px',
                                                transform: isExpanded ? 'rotate(90deg)' : 'none',
                                                transition: 'transform 0.15s',
                                            }}>›</span>
                                        </button>
                                        
                                        {isExpanded && (
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(5, 1fr)',
                                                gap: 3,
                                                padding: 6,
                                                background: '#fff',
                                            }}>
                                                {categoryPatterns.map((pattern) => {
                                                    const isSelected = value.patternId === pattern.id;
                                                    return (
                                                        <button
                                                            key={pattern.id}
                                                            type="button"
                                                            onClick={() => handlePatternSelect(pattern.id)}
                                                            title={pattern.label}
                                                            style={{
                                                                width: '100%',
                                                                aspectRatio: '1',
                                                                padding: 0,
                                                                border: isSelected ? '2px solid #000000' : '1px solid #e0e0e0',
                                                                borderRadius: 2,
                                                                background: '#fff',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            <PatternPreviewSVG 
                                                                patternId={pattern.id} 
                                                                color={currentPatternColor}
                                                                size={28}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pattern Color */}
                    <ColorPicker
                        label="Stroke"
                        value={currentPatternColor}
                        onChange={(color) => onChange({
                            ...value,
                            patternColors: { ...value.patternColors, primary: color },
                        })}
                    />

                        {/* Opacity */}
                    <div style={styles.row}>
                        <span style={{ minWidth: 42 }}>Opacity</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                                value={Math.round((value.opacity ?? 1) * 100)}
                            onChange={(e) => onChange({ ...value, opacity: parseInt(e.target.value) / 100 })}
                            style={{ 
                                flex: 1, 
                                minWidth: 0,
                                '--slider-progress': `${Math.round((value.opacity ?? 1) * 100)}%`
                            } as React.CSSProperties}
                        />
                        <span style={styles.value}>{Math.round((value.opacity ?? 1) * 100)}%</span>
                    </div>
                </>
            )}

            {/* Gradient Options */}
            {value.type === 'gradient' && value.gradient && (
                <>
                    {/* Gradient Preview */}
                    <div style={{
                        width: '100%',
                        height: 60,
                        border: '1px solid #e0e0e0',
                        borderRadius: 3,
                        overflow: 'hidden',
                        background: value.gradient.type === 'linear'
                            ? `linear-gradient(${value.gradient.angle ?? 135}deg, ${value.gradient.stops?.[0]?.color ?? '#c0c0c0'}, ${value.gradient.stops?.[1]?.color ?? '#000000'})`
                            : `radial-gradient(circle, ${value.gradient.stops?.[0]?.color ?? '#c0c0c0'}, ${value.gradient.stops?.[1]?.color ?? '#000000'})`,
                    }} />

                    {/* Gradient Type */}
                    <div>
                        <label style={styles.label}>Gradient</label>
                        <select
                            value={value.gradient.type}
                            onChange={(e) => onChange({
                                ...value,
                                gradient: { ...value.gradient!, type: e.target.value as 'linear' | 'radial' },
                            })}
                            style={styles.select}
                        >
                            <option value="linear">Linear</option>
                            <option value="radial">Radial</option>
                        </select>
                    </div>

                    {/* Opacity */}
                    <div style={styles.row}>
                        <span style={{ minWidth: 42 }}>Opacity</span>
                            <input
                                type="range"
                                min="0"
                            max="100"
                            value={Math.round((value.opacity ?? 1) * 100)}
                            onChange={(e) => onChange({ ...value, opacity: parseInt(e.target.value) / 100 })}
                            style={{ 
                                flex: 1, 
                                minWidth: 0,
                                '--slider-progress': `${Math.round((value.opacity ?? 1) * 100)}%`
                            } as React.CSSProperties}
                        />
                        <span style={styles.value}>{Math.round((value.opacity ?? 1) * 100)}%</span>
                    </div>

                    {/* Gradient Colors */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                            <label style={styles.label}>Start</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 6px',
                                border: '1px solid #e0e0e0',
                                borderRadius: 3,
                                background: '#f5f5f5',
                            }}>
                                <div 
                                    style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: 2,
                                        backgroundColor: value.gradient.stops?.[0]?.color ?? '#c0c0c0',
                                        border: '1px solid #000',
                                    }}
                                />
                                <span style={{ fontSize: '9px', color: '#6c6c6c' }}>
                                    {(value.gradient.stops?.[0]?.color ?? '#c0c0c0').toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={styles.label}>End</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 6px',
                                border: '1px solid #e0e0e0',
                                borderRadius: 3,
                                background: '#f5f5f5',
                            }}>
                                <div 
                                    style={{
                                        width: 14,
                                        height: 14,
                                        borderRadius: 2,
                                        backgroundColor: value.gradient.stops?.[1]?.color ?? '#000000',
                                        border: '1px solid #000',
                                    }}
                                />
                                <span style={{ fontSize: '9px', color: '#6c6c6c' }}>
                                    {(value.gradient.stops?.[1]?.color ?? '#000000').toUpperCase()}
                            </span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Image Options */}
            {value.type === 'image' && (
                <div style={{ 
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 3,
                    textAlign: 'center',
                    border: '1px solid #e0e0e0',
                }}>
                    <p style={{ fontSize: '9px', color: '#6c6c6c', margin: 0 }}>
                        Image fill coming soon
                    </p>
                </div>
            )}

            {/* None */}
            {value.type === 'none' && (
                <div style={{ 
                    padding: 12,
                    background: '#f5f5f5',
                    borderRadius: 3,
                    textAlign: 'center',
                    border: '1px solid #e0e0e0',
                }}>
                    <p style={{ fontSize: '9px', color: '#6c6c6c', margin: 0 }}>
                        No fill applied
                    </p>
                </div>
            )}
        </div>
    );
};
