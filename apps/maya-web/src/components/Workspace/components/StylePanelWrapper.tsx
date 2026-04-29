import React, { useState, useEffect, useRef } from 'react';
import { StylePanel } from './styling';
import type { Shape } from '../types';
import { useWorkspaceControllerContext } from '../context/WorkspaceControllerContext';

interface StylePanelWrapperProps {
    selectedShapes: Shape[];
    openTrigger?: number;
}

export const StylePanelWrapper: React.FC<StylePanelWrapperProps> = ({ selectedShapes, openTrigger = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false);
    const controller = useWorkspaceControllerContext();
    const prevTriggerRef = useRef(0);
    const prevSelectionRef = useRef<string[]>([]);
    const panelRef = useRef<HTMLDivElement>(null);

    // Check for hidden zones
    const hiddenZones = controller.snapshot.shapes.filter(
        s => s.type === 'zone' && (s as import('../types').ZoneShape).disabled
    );
    const hasHiddenZones = hiddenZones.length > 0;

    // Initialize position
    useEffect(() => {
        if (isInitialized) return;
        const viewportWidth = window.innerWidth;
        setPosition({
            x: viewportWidth - 240,
            y: 60,
        });
        setIsInitialized(true);
    }, [isInitialized]);

    // Handle dragging
    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y,
            });
        };
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!panelRef.current) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - panelRef.current.offsetLeft,
            y: e.clientY - panelRef.current.offsetTop,
        });
    };

    // Open style panel when triggered externally (e.g., zone click)
    useEffect(() => {
        if (openTrigger > 0 && openTrigger !== prevTriggerRef.current) {
            setIsOpen(true);
            prevTriggerRef.current = openTrigger;
        }
    }, [openTrigger]);

    // Auto-open when any shape is selected (new selection)
    useEffect(() => {
        const currentIds = selectedShapes.map(s => s.id).sort().join(',');
        const prevIds = prevSelectionRef.current.sort().join(',');
        
        if (selectedShapes.length > 0 && currentIds !== prevIds) {
            setIsOpen(true);
        }
        
        prevSelectionRef.current = selectedShapes.map(s => s.id);
    }, [selectedShapes]);

    // Close panel when selection is cleared (unless there are hidden zones)
    useEffect(() => {
        if (selectedShapes.length === 0 && !hasHiddenZones) {
            setIsOpen(false);
        }
    }, [selectedShapes.length, hasHiddenZones]);

    // Don't render anything if no shapes selected AND no hidden zones
    if (selectedShapes.length === 0 && !hasHiddenZones) {
        return null;
    }

    const shapeType = selectedShapes.length > 1 
        ? `${selectedShapes.length} SHAPES` 
        : (selectedShapes[0]?.type?.toUpperCase() || 'SHAPE');

    return (
        <>
            {/* Style Panel - Clean Theme (like SunlightPanel) */}
            {isOpen && (
                <div
                    ref={panelRef}
                    style={{
                        position: 'fixed',
                        left: `${position.x}px`,
                        top: `${position.y}px`,
                        width: 220,
                        background: '#ffffff',
                        border: '1px solid #000000',
                        borderRadius: 4,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '10px',
                        color: '#000000',
                        zIndex: 1100,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {/* Header - Clean Theme */}
                    <div
                        onMouseDown={handleMouseDown}
                        style={{
                            padding: '8px 10px',
                            background: '#000000',
                            color: '#ffffff',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            userSelect: 'none',
                            borderRadius: '3px 3px 0 0',
                        }}
                    >
                        <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            fontSize: '10px', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.1em',
                        }}>
                            <span style={{ opacity: 0.5, letterSpacing: '-2px' }}>⋮⋮</span>
                            {/* Palette icon */}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" fill="currentColor" />
                            </svg>
                            {shapeType}
                        </span>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                fontSize: '12px',
                                opacity: 0.7,
                            }}
                        >
                            ×
                        </button>
                    </div>
                    
                    {/* Scrollable content */}
                    <div className="panel-scroll-area" style={{
                        maxHeight: 'calc(100vh - 200px)',
                    }}>
                        <StylePanel
                            shapes={selectedShapes}
                            allShapes={controller.snapshot.shapes}
                            onUpdateAppearance={(shapeId, appearance) => {
                                if (appearance.fill) {
                                    controller.setShapeFill(shapeId, appearance.fill);
                                }
                                if (appearance.stroke) {
                                    controller.setShapeStroke(shapeId, appearance.stroke);
                                }
                                if (appearance.opacity !== undefined) {
                                    controller.setShapeOpacity(shapeId, appearance.opacity);
                                }
                                if (appearance.blendMode) {
                                    controller.setShapeBlendMode(shapeId, appearance.blendMode);
                                }
                                if ('shadow' in appearance) {
                                    controller.setShapeShadow(shapeId, appearance.shadow ?? null);
                                }
                            }}
                            onDeleteSelection={() => {
                                controller.deleteSelection();
                                setIsOpen(false);
                            }}
                            onZoneDisabledChange={(zoneId, disabled) => {
                                controller.setZoneDisabled(zoneId, disabled);
                                if (disabled) {
                                    controller.setPrimarySelection(null);
                                }
                            }}
                        />
                    </div>
                </div>
            )}
        </>
    );
};
