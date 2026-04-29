import React from 'react';
import { Database } from 'lucide-react';

interface DataModeToggleProps {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
}

export const DataModeToggle: React.FC<DataModeToggleProps> = ({ enabled, onChange }) => {
    return (
        <div
            onClick={() => onChange(!enabled)}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '20px',
                backgroundColor: enabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${enabled ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)'}`,
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                flexShrink: 0,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = enabled ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = enabled ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)';
            }}
            title={enabled ? 'Data Mode: ON' : 'Data Mode: OFF'}
        >
            <Database
                size={14}
                style={{
                    color: enabled ? '#FFFFFF' : '#B0B0B0',
                    strokeWidth: 2,
                    transition: 'color 0.15s',
                }}
            />
        </div>
    );
};
