import React, { useCallback, useRef, useEffect, useState } from 'react';

interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    label?: string;
    showAlpha?: boolean;
}

const PRESET_COLORS = [
    '#000000', '#ffffff', '#6c6c6c', '#c0c0c0',
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
    '#8B5CF6', '#EC4899', '#6F62A4', '#1F2937',
];

// Convert hex to HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, v: 100 };
    
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    
    if (max !== min) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s: s * 100, v: v * 100 };
}

// Convert HSV to hex
function hsvToHex(h: number, s: number, v: number): string {
    const hi = Math.floor(h / 60) % 6;
    const f = h / 60 - Math.floor(h / 60);
    const p = v * (1 - s / 100) / 100;
    const q = v * (1 - f * s / 100) / 100;
    const t = v * (1 - (1 - f) * s / 100) / 100;
    const vv = v / 100;
    
    let r = 0, g = 0, b = 0;
    switch (hi) {
        case 0: r = vv; g = t; b = p; break;
        case 1: r = q; g = vv; b = p; break;
        case 2: r = p; g = vv; b = t; break;
        case 3: r = p; g = q; b = vv; break;
        case 4: r = t; g = p; b = vv; break;
        case 5: r = vv; g = p; b = q; break;
    }
    
    const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label, showAlpha = false }) => {
    const [localValue, setLocalValue] = useState(value);
    const [hsv, setHsv] = useState(() => hexToHsv(value));
    const satValRef = useRef<HTMLDivElement>(null);
    const hueRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDraggingHue, setIsDraggingHue] = useState(false);
    const [previewHsv, setPreviewHsv] = useState<{ h: number; s: number; v: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    // Store the confirmed color before any preview starts
    const confirmedColorRef = useRef(value);

    useEffect(() => {
        setLocalValue(value);
        setHsv(hexToHsv(value));
        // Only update confirmed color when value changes from outside (not from preview)
        if (!isHovering) {
            confirmedColorRef.current = value;
        }
    }, [value, isHovering]);

    // Handle click outside - revert to confirmed color if we were previewing
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // Clicked outside - revert to confirmed color
                if (isHovering || previewHsv) {
                    const confirmedColor = confirmedColorRef.current;
                    setLocalValue(confirmedColor);
                    setHsv(hexToHsv(confirmedColor));
                    onChange(confirmedColor);
                    setPreviewHsv(null);
                    setIsHovering(false);
                }
            }
        };

            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isHovering, previewHsv, onChange]);

    const updateColor = useCallback((newHsv: { h: number; s: number; v: number }, confirm = false) => {
        const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
        setHsv(newHsv);
        setLocalValue(hex);
        onChange(hex);
        if (confirm) {
            confirmedColorRef.current = hex;
        }
    }, [onChange]);

    // Calculate HSV from mouse position in saturation/value picker
    const getHsvFromSatValPosition = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!satValRef.current) return null;
        const rect = satValRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        return { ...hsv, s: x * 100, v: (1 - y) * 100 };
    }, [hsv]);

    // Hover over saturation/value picker - live preview
    const handleSatValHover = useCallback((e: React.MouseEvent) => {
        setIsHovering(true);
        const newHsv = getHsvFromSatValPosition(e);
        if (newHsv) {
            setPreviewHsv(newHsv);
            // Live preview - update color
            const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
            setLocalValue(hex);
            onChange(hex);
        }
    }, [getHsvFromSatValPosition, onChange]);

    // Click to confirm selection
    const handleSatValClick = useCallback((e: React.MouseEvent) => {
        const newHsv = getHsvFromSatValPosition(e);
        if (newHsv) {
            setHsv(newHsv);
            setPreviewHsv(null);
            setIsHovering(false);
            const hex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
            setLocalValue(hex);
            onChange(hex);
            // Update confirmed color since user clicked to select
            confirmedColorRef.current = hex;
        }
    }, [getHsvFromSatValPosition, onChange]);

    // Mouse leave - revert to last confirmed color if not clicked
    const handleSatValLeave = useCallback(() => {
        if (previewHsv) {
            // Revert to confirmed color
            const confirmedColor = confirmedColorRef.current;
            setLocalValue(confirmedColor);
            setHsv(hexToHsv(confirmedColor));
            onChange(confirmedColor);
            setPreviewHsv(null);
        }
        setIsHovering(false);
    }, [previewHsv, onChange]);

    const handleHueMouseDown = (e: React.MouseEvent) => {
        setIsDraggingHue(true);
        handleHueMove(e);
    };

    const handleHueMove = useCallback((e: MouseEvent | React.MouseEvent) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        updateColor({ ...hsv, h: x * 360 });
    }, [hsv, updateColor]);

    useEffect(() => {
        if (!isDraggingHue) return;

        const handleMouseMove = (e: MouseEvent) => {
            handleHueMove(e);
        };

        const handleMouseUp = () => {
            setIsDraggingHue(false);
            // Confirm the color when done dragging hue
            confirmedColorRef.current = localValue;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingHue, handleHueMove, localValue]);

    const handleHexChange = (hex: string) => {
        setLocalValue(hex);
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            setHsv(hexToHsv(hex));
            onChange(hex);
            // Confirm the color when hex is manually entered
            confirmedColorRef.current = hex;
        }
    };

    const hueColor = hsvToHex(hsv.h, 100, 100);

    return (
        <div 
            ref={containerRef}
            style={{ 
                width: '100%', 
                fontFamily: "'IBM Plex Mono', monospace",
            }}
        >
            {label && (
                <label style={{ 
                    display: 'block', 
                    fontSize: '9px',
                    fontWeight: 600,
                    color: '#6c6c6c',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                }}>
                    {label}
                </label>
            )}

            {/* Saturation/Value picker - inline */}
            <div
                ref={satValRef}
                onMouseMove={handleSatValHover}
                onMouseLeave={handleSatValLeave}
                onClick={handleSatValClick}
                style={{
                    width: '100%',
                    height: 80,
                    borderRadius: 3,
                    position: 'relative',
                    cursor: 'crosshair',
                    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})`,
                    marginBottom: 8,
                    border: '1px solid #e0e0e0',
                }}
            >
                {/* Picker indicator */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${previewHsv ? previewHsv.s : hsv.s}%`,
                        top: `${100 - (previewHsv ? previewHsv.v : hsv.v)}%`,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        boxShadow: '0 0 0 1px #000',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none',
                    }}
                />
            </div>

            {/* Hue slider */}
            <div
                ref={hueRef}
                onMouseDown={handleHueMouseDown}
                style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    position: 'relative',
                    cursor: 'pointer',
                    background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
                    marginBottom: 8,
                }}
            >
                {/* Hue indicator */}
                <div
                    style={{
                        position: 'absolute',
                        left: `${(hsv.h / 360) * 100}%`,
                        top: '50%',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        border: '2px solid #fff',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: hueColor,
                        pointerEvents: 'none',
                        transition: 'transform 0.1s ease',
                    }}
                />
            </div>

            {/* Preset colors - compact row */}
            <div style={{ 
                display: 'flex', 
                gap: 3, 
                flexWrap: 'wrap',
                marginBottom: 8,
            }}>
                {PRESET_COLORS.map((color, i) => (
                    <button
                        key={`${color}-${i}`}
                        onClick={() => {
                            const newHsv = hexToHsv(color);
                            setHsv(newHsv);
                            setLocalValue(color);
                            onChange(color);
                            // Confirm the color when preset is clicked
                            confirmedColorRef.current = color;
                            setPreviewHsv(null);
                            setIsHovering(false);
                        }}
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 2,
                            backgroundColor: color,
                            border: localValue.toUpperCase() === color.toUpperCase() 
                                ? '2px solid #000000' 
                                : '1px solid #e0e0e0',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    />
                ))}
            </div>

            {/* Hex input - compact */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
            }}>
                <div
                    style={{
                        width: 18,
                        height: 18,
                        borderRadius: 2,
                        backgroundColor: localValue,
                        border: '1px solid #000000',
                        flexShrink: 0,
                    }}
                />
                <input
                    type="text"
                    value={localValue.toUpperCase()}
                    onChange={(e) => handleHexChange(e.target.value)}
                    style={{
                        flex: 1,
                        padding: '4px 6px',
                        border: '1px solid #e0e0e0',
                        borderRadius: 2,
                        fontSize: '9px',
                        color: '#000000',
                        background: '#f5f5f5',
                        fontFamily: "'IBM Plex Mono', monospace",
                        minWidth: 0,
                    }}
                />
            </div>

                    {showAlpha && (
                <div style={{ marginTop: 8 }}>
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '9px',
                        color: '#6c6c6c',
                        marginBottom: 4,
                    }}>
                        <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Opacity</span>
                        <span>{Math.round(getAlphaFromColor(localValue) * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={Math.round(getAlphaFromColor(localValue) * 100)}
                                onChange={(e) => {
                                    const alpha = parseInt(e.target.value) / 100;
                            const newColor = setAlphaInColor(localValue, alpha);
                            setLocalValue(newColor);
                            onChange(newColor);
                                }}
                                style={{ width: '100%' }}
                            />
                        </div>
            )}
        </div>
    );
};

function getAlphaFromColor(color: string): number {
    if (color.startsWith('#') && color.length === 9) {
        const alpha = parseInt(color.slice(7, 9), 16) / 255;
        return alpha;
    }
    const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbaMatch && rgbaMatch[4]) {
        return parseFloat(rgbaMatch[4]);
    }
    return 1.0;
}

function setAlphaInColor(color: string, alpha: number): string {
    let baseColor = color;
    if (color.startsWith('#')) {
        baseColor = color.length === 9 ? color.slice(0, 7) : color.slice(0, 7);
    } else if (color.startsWith('rgb')) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const r = parseInt(match[1]).toString(16).padStart(2, '0');
            const g = parseInt(match[2]).toString(16).padStart(2, '0');
            const b = parseInt(match[3]).toString(16).padStart(2, '0');
            baseColor = `#${r}${g}${b}`;
        }
    }

    if (!baseColor.startsWith('#') || baseColor.length !== 7) {
        baseColor = '#000000';
    }

    const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${baseColor}${alphaHex}`;
}
