import { Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from 'react';
import type { MeasurementSettings } from '../types';

interface MeasurementMenuProps {
    measurementSettings: MeasurementSettings;
    onMeasurementSettingsChange: (settings: Partial<MeasurementSettings>) => void;
    onClose: () => void;
    triggerRef?: React.RefObject<HTMLDivElement | null>;
}

interface MeasurementOption {
    key: keyof Omit<MeasurementSettings, 'enabled'>;
    label: string;
}

const measurementOptions: MeasurementOption[] = [
    { key: 'linearDimensions', label: 'Dimension lines' },
    { key: 'chipDimensions', label: 'Measurement chips' },
    { key: 'arcDimensions', label: 'Arc dimensions' },
    { key: 'spanDimensions', label: 'Span dimensions' },
    { key: 'angles', label: 'Angles' },
    { key: 'areaLabels', label: 'Area labels' },
];

// Icon component for each measurement type
const MeasurementIcon: React.FC<{ type: keyof Omit<MeasurementSettings, 'enabled'> }> = ({ type }) => {
    const iconSize = 16;
    const color = '#6F62A4';

    switch (type) {
        case 'linearDimensions':
            return (
                <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
                    <line x1="3" y1="8" x2="13" y2="8" stroke={color} strokeWidth="1.5" />
                    <line x1="3" y1="5" x2="3" y2="11" stroke={color} strokeWidth="1.5" />
                    <line x1="13" y1="5" x2="13" y2="11" stroke={color} strokeWidth="1.5" />
                </svg>
            );
        case 'chipDimensions':
            return (
                <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
                    <rect x="3" y="6" width="10" height="4" rx="2" fill="none" stroke={color} strokeWidth="1.5" />
                    <text x="8" y="9.5" fontSize="6" fill={color} textAnchor="middle" fontWeight="600">12</text>
                </svg>
            );
        case 'arcDimensions':
            return (
                <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
                    <path
                        d="M 4 12 A 6 6 0 0 1 12 4"
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                    />
                    <line x1="4" y1="12" x2="4" y2="14" stroke={color} strokeWidth="1.5" />
                    <line x1="12" y1="4" x2="14" y2="4" stroke={color} strokeWidth="1.5" />
                </svg>
            );
        case 'spanDimensions':
            return (
                <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
                    <line x1="4" y1="8" x2="12" y2="8" stroke={color} strokeWidth="1.5" />
                    <polygon points="4,8 6,7 6,9" fill={color} />
                    <polygon points="12,8 10,7 10,9" fill={color} />
                </svg>
            );
        case 'angles':
            return (
                <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
                    <line x1="3" y1="13" x2="13" y2="13" stroke={color} strokeWidth="1.5" />
                    <line x1="3" y1="13" x2="13" y2="3" stroke={color} strokeWidth="1.5" />
                    <path
                        d="M 7 13 A 4 4 0 0 1 10 10"
                        fill="none"
                        stroke={color}
                        strokeWidth="1"
                    />
                </svg>
            );
        case 'areaLabels':
            return (
                <svg width={iconSize} height={iconSize} viewBox="0 0 16 16">
                    <rect x="3" y="3" width="10" height="10" fill="none" stroke={color} strokeWidth="1.5" />
                    <text x="8" y="9.5" fontSize="6" fill={color} textAnchor="middle" fontWeight="600">A</text>
                </svg>
            );
        default:
            return null;
    }
};

export const MeasurementMenu: React.FC<MeasurementMenuProps> = ({
    measurementSettings,
    onMeasurementSettingsChange,
    triggerRef,
}) => {
    const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (triggerRef?.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top - 6, // margin bottom
                right: window.innerWidth - rect.right,
            });
        }
    }, [triggerRef]);

    const toggleMeasurementOption = (key: keyof Omit<MeasurementSettings, 'enabled'>) => {
        onMeasurementSettingsChange({ [key]: !measurementSettings[key] });
    };

    const toggleMeasurementMode = () => {
        onMeasurementSettingsChange({ enabled: !measurementSettings.enabled });
    };

    if (!position) return null;

    const menuContent = (
        <div
            ref={menuRef}
            data-menu-type="measurement"
            style={{
                position: 'fixed',
                bottom: `calc(100vh - ${position.top}px)`,
                right: position.right,
                marginBottom: '6px',
                backgroundColor: '#FDFCFD',
                border: '1px solid #D8D2E9',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(111, 98, 164, 0.12)',
                padding: '4px 0',
                minWidth: '180px',
                zIndex: 9999,
                userSelect: 'none',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '4px 10px 3px 10px',
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    color: '#9B8BB7',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                }}
            >
                Show measurements...
            </div>

            {/* Measurement options */}
            {measurementOptions.map((option) => (
                <div
                    key={option.key}
                    onClick={() => toggleMeasurementOption(option.key)}
                    style={{
                        padding: '4px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        color: '#3B3B3B',
                        backgroundColor: 'transparent',
                        transition: 'background-color 0.15s',
                        whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F7F5FA';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MeasurementIcon type={option.key} />
                        <span style={{ fontWeight: 500, fontSize: '0.7rem' }}>
                            {option.label}
                        </span>
                    </div>
                    {measurementSettings[option.key] && (
                        <Check size={13} style={{ color: '#6F62A4', strokeWidth: 2.5 }} />
                    )}
                </div>
            ))}

            {/* Divider */}
            <div
                style={{
                    height: '1px',
                    backgroundColor: '#E8E5F0',
                    margin: '4px 0',
                }}
            />

            {/* Measurement mode toggle */}
            <div
                onClick={toggleMeasurementMode}
                style={{
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: '#3B3B3B',
                    backgroundColor: 'transparent',
                    transition: 'background-color 0.15s',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F7F5FA';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                }}
            >
                <span style={{ fontWeight: 500 }}>Show all measurements</span>
                {measurementSettings.enabled && (
                    <Check size={13} style={{ color: '#6F62A4', strokeWidth: 2.5 }} />
                )}
            </div>
        </div>
    );

    return createPortal(menuContent, document.body);
};

