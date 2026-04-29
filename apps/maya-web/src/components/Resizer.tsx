import { useEffect, useRef } from 'react';

interface ResizerProps {
  onResize: (delta: number) => void;
  direction: 'left' | 'right';
}

export default function Resizer({ onResize, direction }: ResizerProps) {
  const resizerRef = useRef<HTMLDivElement>(null);
  const onResizeRef = useRef(onResize);

  // Keep the callback ref up to date
  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    const resizer = resizerRef.current;
    if (!resizer) return;

    let startX = 0;
    let isResizing = false;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      isResizing = true;
      startX = e.clientX;
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
      document.body.style.cursor = 'col-resize';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = direction === 'left' ? e.clientX - startX : startX - e.clientX;
      startX = e.clientX;
      onResizeRef.current(delta);
    };

    const onMouseUp = () => {
      isResizing = false;
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    resizer.addEventListener('mousedown', onMouseDown);

    return () => {
      resizer.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [direction]);

  return <div ref={resizerRef} className="resizer-v" />;
}

