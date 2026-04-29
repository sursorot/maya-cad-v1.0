import { useState, useEffect } from 'react';
import type { RefObject } from 'react';
import type { ViewBox } from '../types';
import {
  DEFAULT_VIEW_WIDTH,
  DEFAULT_SCALE,
  MIN_SCALE,
  MAX_SCALE,
  ZOOM_IN_FACTOR,
  ZOOM_OUT_FACTOR,
  PINCH_ZOOM_IN_FACTOR,
  PINCH_ZOOM_OUT_FACTOR,
} from '../constants';

interface UseZoomPanProps {
  containerRef: RefObject<HTMLDivElement>;
  canvasOpen: boolean;
  onScaleChange?: (scale: number) => void;
  onViewBoxChange?: (viewBox: ViewBox) => void;
}

export const useZoomPan = ({ containerRef, canvasOpen, onScaleChange, onViewBoxChange }: UseZoomPanProps) => {
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [viewBox, setViewBox] = useState<ViewBox>({ x: -5, y: -5, width: 10, height: 10 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Update parent component with scale changes
  useEffect(() => {
    if (onScaleChange) {
      onScaleChange(scale);
    }
  }, [scale, onScaleChange]);

  // Update parent component with viewBox changes
  useEffect(() => {
    if (onViewBoxChange) {
      onViewBoxChange(viewBox);
    }
  }, [viewBox, onViewBoxChange]);

  // Zoom control functions
  const handleZoomIn = () => {
    const newScale = Math.min(scale * ZOOM_IN_FACTOR, MAX_SCALE);
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Zoom towards center
    const svgX = viewBox.x + (centerX / rect.width) * viewBox.width;
    const svgY = viewBox.y + (centerY / rect.height) * viewBox.height;

    const newWidth = viewBox.width * (scale / newScale);
    const newHeight = viewBox.height * (scale / newScale);

    const newX = svgX - (centerX / rect.width) * newWidth;
    const newY = svgY - (centerY / rect.height) * newHeight;

    setScale(newScale);
    setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale * ZOOM_OUT_FACTOR, MIN_SCALE);
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Zoom from center
    const svgX = viewBox.x + (centerX / rect.width) * viewBox.width;
    const svgY = viewBox.y + (centerY / rect.height) * viewBox.height;

    const newWidth = viewBox.width * (scale / newScale);
    const newHeight = viewBox.height * (scale / newScale);

    const newX = svgX - (centerX / rect.width) * newWidth;
    const newY = svgY - (centerY / rect.height) * newHeight;

    setScale(newScale);
    setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
  };

  const handleZoomReset = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const aspectRatio = rect.height / rect.width;
    const viewHeight = DEFAULT_VIEW_WIDTH * aspectRatio;

    setScale(DEFAULT_SCALE);
    setViewBox({
      x: -DEFAULT_VIEW_WIDTH / 2,
      y: -viewHeight / 2,
      width: DEFAULT_VIEW_WIDTH,
      height: viewHeight,
    });
  };

  // Initialize viewBox based on container size (only on first open)
  useEffect(() => {
    if (containerRef.current && canvasOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      const aspectRatio = rect.height / rect.width;
      const viewHeight = DEFAULT_VIEW_WIDTH * aspectRatio;

      setViewBox({
        x: -DEFAULT_VIEW_WIDTH / 2,
        y: -viewHeight / 2,
        width: DEFAULT_VIEW_WIDTH,
        height: viewHeight,
      });
    }
  }, [canvasOpen, containerRef]);

  // Mouse and wheel event handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canvasOpen) return;

    // Handle zoom with pinch gesture (wheel event with ctrlKey)
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as Element;
      
      // Check if the wheel event originates from inside a scrollable panel
      // These panels should handle their own scrolling, not trigger canvas pan/zoom
      const isInsideScrollablePanel = target.closest(
        '.panel-scroll-area, .style-panel__body'
      );
      
      if (isInsideScrollablePanel) {
        // Don't prevent default - let the panel scroll naturally
        return;
      }
      
      // Only handle wheel events that target the SVG canvas or its container
      // This allows other UI elements (toolbars, panels) to scroll normally
      const svg = container.querySelector('svg');
      const isOnCanvas = svg && (target === svg || svg.contains(target) || target === container);
      
      if (!isOnCanvas) {
        // Event is on some other UI element - let it handle normally
        return;
      }

      e.preventDefault();

      if (e.ctrlKey) {
        // Pinch zoom
        const delta = -e.deltaY;
        const scaleChange = delta > 0 ? PINCH_ZOOM_IN_FACTOR : PINCH_ZOOM_OUT_FACTOR;
        const newScale = Math.min(Math.max(MIN_SCALE, scale * scaleChange), MAX_SCALE);

        // Zoom towards cursor position
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert mouse position to SVG coordinates
        const svgX = viewBox.x + (mouseX / rect.width) * viewBox.width;
        const svgY = viewBox.y + (mouseY / rect.height) * viewBox.height;

        // Calculate new viewBox dimensions
        const newWidth = viewBox.width * (scale / newScale);
        const newHeight = viewBox.height * (scale / newScale);

        // Adjust viewBox to zoom towards mouse position
        const newX = svgX - (mouseX / rect.width) * newWidth;
        const newY = svgY - (mouseY / rect.height) * newHeight;

        setScale(newScale);
        setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
      } else {
        // Two-finger pan
        const panScale = viewBox.width / container.getBoundingClientRect().width;
        setViewBox((prev) => ({
          ...prev,
          x: prev.x + e.deltaX * panScale,
          y: prev.y + e.deltaY * panScale,
        }));
      }
    };

    // Handle mouse drag panning
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
        setIsPanning(true);
        setStartPan({ x: e.clientX, y: e.clientY });
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        const rect = container.getBoundingClientRect();
        const dx = e.clientX - startPan.x;
        const dy = e.clientY - startPan.y;
        const panScale = viewBox.width / rect.width;

        setViewBox((prev) => ({
          ...prev,
          x: prev.x - dx * panScale,
          y: prev.y - dy * panScale,
        }));

        setStartPan({ x: e.clientX, y: e.clientY });
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasOpen, scale, viewBox, isPanning, startPan, containerRef]);

  return {
    scale,
    viewBox,
    isPanning,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    setViewBox,
  };
};

