/**
 * Resize Interaction Hook
 * 
 * Handles resize operations for various shape types.
 * Extracted from useCanvasInteraction for better organization.
 */

import { useState, useCallback } from 'react';
import type { Point } from '../../../types';

type ResizeHandle = 'start' | 'end';
type CornerHandle = 'tl' | 'tr' | 'bl' | 'br';
type EdgeHandle = 'top' | 'right' | 'bottom' | 'left';

interface TextResizeInitial {
  width: number;
  height: number;
  fontSize: number;
  position: Point;
  textAlign: 'left' | 'center' | 'right';
}

interface UseResizeInteractionReturn {
  // Line/Arc resize
  isResizing: boolean;
  resizeHandle: ResizeHandle | null;
  startResize: (handle: ResizeHandle) => void;
  
  // Polyline corner resize
  isResizingPolylineCorner: boolean;
  polylineCorner: CornerHandle | null;
  startPolylineCornerResize: (corner: CornerHandle) => void;
  
  // Rectangle edge resize
  isResizingRectangleEdge: boolean;
  rectangleEdge: EdgeHandle | null;
  startRectangleEdgeResize: (edge: EdgeHandle) => void;
  
  // Room corner resize
  isResizingRoomCorner: boolean;
  roomCorner: CornerHandle | null;
  startRoomCornerResize: (corner: CornerHandle) => void;
  
  // Text resize
  isResizingText: boolean;
  textResizeCorner: CornerHandle | null;
  textResizeInitial: TextResizeInitial | null;
  startTextResize: (corner: CornerHandle, initial: TextResizeInitial) => void;
  
  // Wall curving
  isCurvingWall: boolean;
  curvingWallId: string | null;
  startWallCurve: (wallId: string) => void;
  
  // Common
  endResize: () => void;
  isAnyResizeActive: () => boolean;
}

/**
 * Hook for resize interaction
 */
export const useResizeInteraction = (): UseResizeInteractionReturn => {
  // Line/Arc resize
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  
  // Polyline corner resize
  const [isResizingPolylineCorner, setIsResizingPolylineCorner] = useState(false);
  const [polylineCorner, setPolylineCorner] = useState<CornerHandle | null>(null);
  
  // Rectangle edge resize
  const [isResizingRectangleEdge, setIsResizingRectangleEdge] = useState(false);
  const [rectangleEdge, setRectangleEdge] = useState<EdgeHandle | null>(null);
  
  // Room corner resize
  const [isResizingRoomCorner, setIsResizingRoomCorner] = useState(false);
  const [roomCorner, setRoomCorner] = useState<CornerHandle | null>(null);
  
  // Text resize
  const [isResizingText, setIsResizingText] = useState(false);
  const [textResizeCorner, setTextResizeCorner] = useState<CornerHandle | null>(null);
  const [textResizeInitial, setTextResizeInitial] = useState<TextResizeInitial | null>(null);
  
  // Wall curving
  const [isCurvingWall, setIsCurvingWall] = useState(false);
  const [curvingWallId, setCurvingWallId] = useState<string | null>(null);

  // Start handlers
  const startResize = useCallback((handle: ResizeHandle) => {
    setIsResizing(true);
    setResizeHandle(handle);
  }, []);

  const startPolylineCornerResize = useCallback((corner: CornerHandle) => {
    setIsResizingPolylineCorner(true);
    setPolylineCorner(corner);
  }, []);

  const startRectangleEdgeResize = useCallback((edge: EdgeHandle) => {
    setIsResizingRectangleEdge(true);
    setRectangleEdge(edge);
  }, []);

  const startRoomCornerResize = useCallback((corner: CornerHandle) => {
    setIsResizingRoomCorner(true);
    setRoomCorner(corner);
  }, []);

  const startTextResize = useCallback((corner: CornerHandle, initial: TextResizeInitial) => {
    setIsResizingText(true);
    setTextResizeCorner(corner);
    setTextResizeInitial(initial);
  }, []);

  const startWallCurve = useCallback((wallId: string) => {
    setIsCurvingWall(true);
    setCurvingWallId(wallId);
  }, []);

  // End all resize operations
  const endResize = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
    setIsResizingPolylineCorner(false);
    setPolylineCorner(null);
    setIsResizingRectangleEdge(false);
    setRectangleEdge(null);
    setIsResizingRoomCorner(false);
    setRoomCorner(null);
    setIsResizingText(false);
    setTextResizeCorner(null);
    setTextResizeInitial(null);
    setIsCurvingWall(false);
    setCurvingWallId(null);
  }, []);

  const isAnyResizeActive = useCallback(() => {
    return (
      isResizing ||
      isResizingPolylineCorner ||
      isResizingRectangleEdge ||
      isResizingRoomCorner ||
      isResizingText ||
      isCurvingWall
    );
  }, [isResizing, isResizingPolylineCorner, isResizingRectangleEdge, isResizingRoomCorner, isResizingText, isCurvingWall]);

  return {
    // Line/Arc resize
    isResizing,
    resizeHandle,
    startResize,
    
    // Polyline corner resize
    isResizingPolylineCorner,
    polylineCorner,
    startPolylineCornerResize,
    
    // Rectangle edge resize
    isResizingRectangleEdge,
    rectangleEdge,
    startRectangleEdgeResize,
    
    // Room corner resize
    isResizingRoomCorner,
    roomCorner,
    startRoomCornerResize,
    
    // Text resize
    isResizingText,
    textResizeCorner,
    textResizeInitial,
    startTextResize,
    
    // Wall curving
    isCurvingWall,
    curvingWallId,
    startWallCurve,
    
    // Common
    endResize,
    isAnyResizeActive,
  };
};

