/**
 * usePrecisionInput Hook
 * 
 * Manages the state and logic for precision coordinate input during drawing.
 * This hook handles:
 * - Capturing keyboard input during drawing
 * - Parsing coordinate inputs
 * - Calculating preview points
 * - Managing input state
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Point, LengthUnit } from '../../types';
import { parseCoordinateInput, resolveCoordinate } from '../../../../lib/precision/coordinateParser';
import type { CoordinateContext, ParsedCoordinate } from '../../../../lib/precision/types';

export interface UsePrecisionInputOptions {
  /** Whether precision input is enabled */
  enabled: boolean;
  
  /** The last confirmed point (origin for relative coords) */
  lastPoint: Point;
  
  /** Current cursor position in canvas coordinates */
  cursorPosition: Point;
  
  /** Current workspace length unit */
  lengthUnit: LengthUnit;
  
  /** Callback when a point is confirmed via keyboard input */
  onPointConfirmed: (point: Point) => void;
  
  /** Whether we're currently in a drawing operation */
  isDrawing: boolean;
}

export interface UsePrecisionInputResult {
  /** Whether keyboard input mode is active */
  isInputActive: boolean;
  
  /** Current input buffer */
  inputValue: string;
  
  /** Preview point based on current input (null if invalid) */
  previewPoint: Point | null;
  
  /** Error message if input is invalid */
  error: string | null;
  
  /** Start accepting keyboard input */
  startInput: () => void;
  
  /** Cancel current input */
  cancelInput: () => void;
  
  /** Handle a keyboard event. Returns true if event was consumed. */
  handleKeyDown: (e: KeyboardEvent) => boolean;
  
  /** Current parsed result (for debugging/display) */
  parsedResult: ParsedCoordinate | null;
}

/**
 * Hook for managing precision coordinate input
 */
export function usePrecisionInput(options: UsePrecisionInputOptions): UsePrecisionInputResult {
  const {
    enabled,
    lastPoint,
    cursorPosition,
    lengthUnit,
    onPointConfirmed,
    isDrawing,
  } = options;
  
  // State
  const [isInputActive, setIsInputActive] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Ref for input buffer (avoids state sync issues in event handler)
  const inputBufferRef = useRef('');
  
  // Calculate cursor direction for direct distance entry
  const cursorDirection = useMemo(() => ({
    x: cursorPosition.x - lastPoint.x,
    y: cursorPosition.y - lastPoint.y,
  }), [cursorPosition, lastPoint]);
  
  // Context for coordinate resolution
  const context: CoordinateContext = useMemo(() => ({
    lastPoint,
    cursorDirection,
    defaultUnit: lengthUnit,
  }), [lastPoint, cursorDirection, lengthUnit]);
  
  // Parse current input and calculate preview point
  const { previewPoint, parsedResult } = useMemo(() => {
    if (!isInputActive || !inputValue.trim()) {
      return { previewPoint: null, parsedResult: null };
    }
    
    const parsed = parseCoordinateInput(inputValue);
    
    if (parsed.type === 'error') {
      return { previewPoint: null, parsedResult: null };
    }
    
    const point = resolveCoordinate(parsed, context);
    return { 
      previewPoint: point, 
      parsedResult: parsed as ParsedCoordinate 
    };
  }, [inputValue, isInputActive, context]);
  
  // Update error state based on preview
  useEffect(() => {
    if (!isInputActive) {
      setError(null);
      return;
    }
    
    if (inputValue.trim() && !previewPoint) {
      const parsed = parseCoordinateInput(inputValue);
      if (parsed.type === 'error') {
        setError(parsed.message);
      } else {
        setError('Cannot resolve coordinate');
      }
    } else {
      setError(null);
    }
  }, [isInputActive, inputValue, previewPoint]);
  
  // Reset when drawing ends
  useEffect(() => {
    if (!isDrawing) {
      setIsInputActive(false);
      setInputValue('');
      setError(null);
      inputBufferRef.current = '';
    }
  }, [isDrawing]);
  
  /**
   * Start input mode
   */
  const startInput = useCallback(() => {
    setIsInputActive(true);
    setInputValue('');
    setError(null);
    inputBufferRef.current = '';
  }, []);
  
  /**
   * Cancel current input
   */
  const cancelInput = useCallback(() => {
    setIsInputActive(false);
    setInputValue('');
    setError(null);
    inputBufferRef.current = '';
  }, []);
  
  /**
   * Confirm current input
   */
  const confirmInput = useCallback(() => {
    if (!previewPoint) {
      setError('Invalid input');
      return;
    }
    
    onPointConfirmed(previewPoint);
    cancelInput();
  }, [previewPoint, onPointConfirmed, cancelInput]);
  
  /**
   * Handle keyboard events
   * Returns true if the event was handled
   */
  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!enabled || !isDrawing) return false;
    
    // Characters that can start coordinate input
    const isCoordChar = /^[\d.@<,\-]$/.test(e.key);
    
    // Start input mode when typing a coordinate character
    if (!isInputActive && isCoordChar) {
      setIsInputActive(true);
      inputBufferRef.current = e.key;
      setInputValue(e.key);
      return true;
    }
    
    if (!isInputActive) return false;
    
    // Handle special keys during input
    switch (e.key) {
      case 'Enter':
        confirmInput();
        return true;
        
      case 'Escape':
        cancelInput();
        return true;
        
      case 'Backspace':
        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
        setInputValue(inputBufferRef.current);
        
        // Exit input mode if buffer is empty
        if (inputBufferRef.current.length === 0) {
          setIsInputActive(false);
        }
        return true;
        
      case 'Tab':
        // Could be used for field switching in DynamicInput
        return true;
        
      default:
        // Append valid characters to input
        if (/^[\d.@<,\-\s'"]$/.test(e.key)) {
          inputBufferRef.current += e.key;
          setInputValue(inputBufferRef.current);
          return true;
        }
        return false;
    }
  }, [enabled, isDrawing, isInputActive, confirmInput, cancelInput]);
  
  return {
    isInputActive,
    inputValue,
    previewPoint,
    error,
    startInput,
    cancelInput,
    handleKeyDown,
    parsedResult,
  };
}

export default usePrecisionInput;

