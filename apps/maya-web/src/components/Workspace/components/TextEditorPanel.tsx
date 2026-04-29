import React, { useState, useEffect, useRef } from 'react';
import type { TextShape } from '../types';

interface TextEditorPanelProps {
    textShape: TextShape;
    onUpdate: (updates: Partial<TextShape>) => void;
    onConfirm: () => void;
    position: { x: number; y: number }; // Screen coordinates for positioning
}

export const TextEditorPanel: React.FC<TextEditorPanelProps> = ({
    textShape,
    onUpdate,
    onConfirm,
    position,
}) => {
    const [content, setContent] = useState(textShape.content);
    const [fontSize, setFontSize] = useState(textShape.fontSize);
    const [textAlign, setTextAlign] = useState(textShape.textAlign);
    const [bold, setBold] = useState(textShape.bold);
    const [italic, setItalic] = useState(textShape.italic);
    const [underline, setUnderline] = useState(textShape.underline);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    // Sync state with props
    useEffect(() => {
        setContent(textShape.content);
        setFontSize(textShape.fontSize);
        setTextAlign(textShape.textAlign);
        setBold(textShape.bold);
        setItalic(textShape.italic);
        setUnderline(textShape.underline);
    }, [textShape]);

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        onUpdate({ content: newContent });
    };

    const handleFontSizeChange = (newSize: number) => {
        if (newSize > 0 && newSize <= 2) { // Reasonable limits
            setFontSize(newSize);
            onUpdate({ fontSize: newSize });
        }
    };

    const handleAlignChange = (newAlign: 'left' | 'center' | 'right') => {
        setTextAlign(newAlign);
        onUpdate({ textAlign: newAlign });
    };

    const handleFormatToggle = (format: 'bold' | 'italic' | 'underline') => {
        switch (format) {
            case 'bold':
                setBold(!bold);
                onUpdate({ bold: !bold });
                break;
            case 'italic':
                setItalic(!italic);
                onUpdate({ italic: !italic });
                break;
            case 'underline':
                setUnderline(!underline);
                onUpdate({ underline: !underline });
                break;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onConfirm();
        }
    };

    // Local position state to handle dragging
    const [currentPosition, setCurrentPosition] = useState(position);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; y: number } | null>(null);

    // Update local position when prop changes, but ONLY if not dragging and not just a small shift
    // This prevents the "jumping" behavior when typing
    // Removed useEffect that synced position with props to keep panel independent
    // The panel will now only move when dragged by the user
    // Initial position is still set via useState(position) on mount

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only allow dragging from the header area (which we'll add)
        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - currentPosition.x,
            y: e.clientY - currentPosition.y
        };
    };

    // Add global mouse up/move listeners when dragging
    useEffect(() => {
        if (isDragging) {
            const onMove = (e: MouseEvent) => {
                if (dragStartRef.current) {
                    setCurrentPosition({
                        x: e.clientX - dragStartRef.current.x,
                        y: e.clientY - dragStartRef.current.y
                    });
                }
            };
            const onUp = () => {
                setIsDragging(false);
                dragStartRef.current = null;
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            return () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
        }
    }, [isDragging]);

    return (
        <div
            style={{
                position: 'fixed',
                left: `${currentPosition.x}px`,
                top: `${currentPosition.y}px`,
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                padding: '16px',
                zIndex: 1000,
                minWidth: '320px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}
        >
            {/* Drag Handle / Header */}
            <div
                onMouseDown={handleMouseDown}
                style={{
                    height: '20px',
                    margin: '-16px -16px 0 -16px',
                    padding: '8px 16px 0 16px',
                    cursor: 'grab',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderTopLeftRadius: '12px',
                    borderTopRightRadius: '12px',
                }}
            >
                <div style={{
                    width: '40px',
                    height: '4px',
                    backgroundColor: '#E0E0E0',
                    borderRadius: '2px'
                }} />
            </div>
            {/* Text Input */}
            <input
                ref={inputRef}
                type="text"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Your text"
                style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    border: 'none',
                    outline: 'none',
                    marginBottom: '12px',
                    fontFamily: 'inherit',
                }}
            />

            {/* Formatting Toolbar */}
            <div
                style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                }}
            >
                {/* Font Size */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px', alignItems: 'center' }}>
                    <button
                        onClick={() => handleFontSizeChange(fontSize - 0.05)}
                        style={{
                            padding: '8px',
                            border: 'none',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                        title="Decrease font size"
                    >
                        −
                    </button>
                    <input
                        type="number"
                        value={fontSize.toFixed(2)}
                        onChange={(e) => handleFontSizeChange(parseFloat(e.target.value) || 0.3)}
                        step="0.05"
                        min="0.1"
                        max="2"
                        style={{
                            width: '60px',
                            padding: '6px 8px',
                            border: 'none',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            fontSize: '14px',
                            textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                        title="Font size"
                    />
                    <button
                        onClick={() => handleFontSizeChange(fontSize + 0.05)}
                        style={{
                            padding: '8px',
                            border: 'none',
                            backgroundColor: 'white',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                        title="Increase font size"
                    >
                        +
                    </button>
                </div>

                {/* Spacer */}
                <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

                {/* Text Alignment */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
                    <button
                        onClick={() => handleAlignChange('left')}
                        style={{
                            padding: '8px 12px',
                            border: 'none',
                            backgroundColor: textAlign === 'left' ? 'white' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            boxShadow: textAlign === 'left' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                        title="Align left"
                    >
                        ☰
                    </button>
                    <button
                        onClick={() => handleAlignChange('center')}
                        style={{
                            padding: '8px 12px',
                            border: 'none',
                            backgroundColor: textAlign === 'center' ? 'white' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            boxShadow: textAlign === 'center' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                        title="Align center"
                    >
                        ☱
                    </button>
                    <button
                        onClick={() => handleAlignChange('right')}
                        style={{
                            padding: '8px 12px',
                            border: 'none',
                            backgroundColor: textAlign === 'right' ? 'white' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            boxShadow: textAlign === 'right' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                        title="Align right"
                    >
                        ☲
                    </button>
                </div>

                {/* Spacer */}
                <div style={{ width: '1px', height: '24px', backgroundColor: '#e5e7eb' }} />

                {/* Text Formatting */}
                <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
                    <button
                        onClick={() => handleFormatToggle('italic')}
                        style={{
                            padding: '8px 12px',
                            border: 'none',
                            backgroundColor: italic ? 'white' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontStyle: 'italic',
                            fontSize: '16px',
                            boxShadow: italic ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                        title="Italic"
                    >
                        I
                    </button>
                    <button
                        onClick={() => handleFormatToggle('bold')}
                        style={{
                            padding: '8px 12px',
                            border: 'none',
                            backgroundColor: bold ? 'white' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            boxShadow: bold ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                        title="Bold"
                    >
                        B
                    </button>
                    <button
                        onClick={() => handleFormatToggle('underline')}
                        style={{
                            padding: '8px 12px',
                            border: 'none',
                            backgroundColor: underline ? 'white' : 'transparent',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '16px',
                            boxShadow: underline ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                        title="Underline"
                    >
                        U
                    </button>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Confirm Button */}
                <button
                    onClick={onConfirm}
                    style={{
                        padding: '8px 16px',
                        border: 'none',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500',
                    }}
                    title="Confirm"
                >
                    ✓
                </button>
            </div>
        </div>
    );
};
