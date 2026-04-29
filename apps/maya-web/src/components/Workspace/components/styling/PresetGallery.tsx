import React from 'react';
import { STYLE_PRESETS } from '../../../../domain/workspace/core/appearanceUtils';
import type { StylePreset } from '../../../../domain/workspace/core/appearanceUtils';
import type { Shape } from '../../types';

interface PresetGalleryProps {
    shapeType?: Shape['type'];
    onSelectPreset: (presetId: string) => void;
    selectedPresetId?: string;
}

export const PresetGallery: React.FC<PresetGalleryProps> = ({
    shapeType,
    onSelectPreset,
    selectedPresetId,
}) => {
    // Filter presets based on shape type
    const filteredPresets = shapeType
        ? STYLE_PRESETS.filter((preset) => preset.applicableTo.includes(shapeType))
        : STYLE_PRESETS;

    const [hoveredPreset, setHoveredPreset] = React.useState<string | null>(null);

    if (filteredPresets.length === 0) {
        return (
            <div style={{
                padding: 20,
                textAlign: 'center',
                color: '#9CA3AF',
                fontSize: '0.875rem',
            }}>
                No presets available for this shape type
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
                fontSize: '0.75rem',
                color: '#6B7280',
                fontWeight: 500,
                marginBottom: 4,
            }}>
                Style Presets ({filteredPresets.length})
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
            }}>
                {filteredPresets.map((preset) => (
                    <PresetCard
                        key={preset.id}
                        preset={preset}
                        isSelected={selectedPresetId === preset.id}
                        isHovered={hoveredPreset === preset.id}
                        onSelect={() => onSelectPreset(preset.id)}
                        onHover={() => setHoveredPreset(preset.id)}
                        onLeave={() => setHoveredPreset(null)}
                    />
                ))}
            </div>
        </div>
    );
};

interface PresetCardProps {
    preset: StylePreset;
    isSelected: boolean;
    isHovered: boolean;
    onSelect: () => void;
    onHover: () => void;
    onLeave: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({
    preset,
    isSelected,
    isHovered,
    onSelect,
    onHover,
    onLeave,
}) => {
    return (
        <button
            onClick={onSelect}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 8,
                border: isSelected ? '2px solid #6F62A4' : '1px solid #D1D5DB',
                borderRadius: 8,
                backgroundColor: isSelected ? '#F3F4F6' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: isHovered && !isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered
                    ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
        >
            {/* Preview Box */}
            <div
                style={{
                    width: '100%',
                    height: 60,
                    borderRadius: 6,
                    marginBottom: 8,
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <svg width="100%" height="100%" style={{ display: 'block' }}>
                    <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill={getPreviewFill(preset)}
                        stroke={getPreviewStroke(preset)}
                        strokeWidth={preset.appearance.stroke?.width || 0}
                        opacity={preset.appearance.opacity ?? 1}
                    />
                </svg>
            </div>

            {/* Preset Name */}
            <div
                style={{
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? '#6F62A4' : '#374151',
                    textAlign: 'left',
                    lineHeight: 1.3,
                }}
            >
                {preset.name}
            </div>

            {/* Applicable Shapes */}
            <div
                style={{
                    fontSize: '0.65rem',
                    color: '#9CA3AF',
                    marginTop: 4,
                    textAlign: 'left',
                }}
            >
                {preset.applicableTo.slice(0, 3).join(', ')}
                {preset.applicableTo.length > 3 && '...'}
            </div>
        </button>
    );
};

// Helper to get preview fill color/pattern
const getPreviewFill = (preset: StylePreset): string => {
    const fill = preset.appearance.fill;
    if (!fill || fill.type === 'none') return 'transparent';
    if (fill.type === 'solid') return fill.color || '#E5E7EB';
    if (fill.type === 'pattern') return fill.patternColors?.primary || '#3B82F6';
    if (fill.type === 'gradient' && fill.gradient) {
        const stops = fill.gradient.stops;
        if (stops.length > 0) return stops[0].color;
    }
    return '#E5E7EB';
};

// Helper to get preview stroke color
const getPreviewStroke = (preset: StylePreset): string => {
    const stroke = preset.appearance.stroke;
    if (!stroke) return 'none';
    return stroke.color;
};
