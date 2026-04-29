import { useState, useRef, useEffect } from 'react';
import { ASSET_REGISTRY, type AssetDefinition } from './Canvas/assetRegistry';

interface AssetPanelProps {
  visible: boolean;
  selectedAssetId: string;
  onAssetSelect: (assetId: string) => void;
}

export const AssetPanel: React.FC<AssetPanelProps> = ({
  visible,
  selectedAssetId,
  onAssetSelect,
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isInitialized, setIsInitialized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initialize position on first render
  useEffect(() => {
    if (!visible || isInitialized) return;
    
    // Position on right side, vertically centered
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = 220;
    const panelHeight = 350;
    
    setPosition({
      x: viewportWidth - panelWidth - 20,
      y: (viewportHeight - panelHeight) / 2,
    });
    setIsInitialized(true);
  }, [visible, isInitialized]);

  // Reset initialization when panel is hidden
  useEffect(() => {
    if (!visible) {
      setIsInitialized(false);
    }
  }, [visible]);

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

    const handleMouseUp = () => {
      setIsDragging(false);
    };

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

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        userSelect: 'none',
        width: '220px',
        zIndex: 1001,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0',
          cursor: isDragging ? 'grabbing' : 'grab',
          borderBottom: '1px solid #e0e0e0',
          marginBottom: '4px',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '12px', color: '#333' }}>
          Assets
        </span>
        <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
          <rect y="0" width="14" height="2" fill="#ccc" rx="1" />
          <rect y="6" width="14" height="2" fill="#ccc" rx="1" />
        </svg>
      </div>

      {/* Asset Grid */}
      <div
        className="panel-scroll-area"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '6px',
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {ASSET_REGISTRY.map((asset) => (
          <AssetButton
            key={asset.id}
            asset={asset}
            isSelected={selectedAssetId === asset.id}
            onClick={() => onAssetSelect(asset.id)}
          />
        ))}
      </div>

      {/* Info text */}
      <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', marginTop: '4px' }}>
        Click on canvas to place selected asset
      </div>
    </div>
  );
};

interface AssetButtonProps {
  asset: AssetDefinition;
  isSelected: boolean;
  onClick: () => void;
}

const AssetButton: React.FC<AssetButtonProps> = ({ asset, isSelected, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '4px',
        padding: '8px 6px 4px',
        backgroundColor: isSelected ? '#eef2ff' : isHovered ? '#f5f5f5' : 'transparent',
        border: isSelected ? '2px solid #4338ca' : '1px solid #e0e0e0',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        minHeight: '72px',
        overflow: 'hidden',
      }}
    >
      {/* Asset preview SVG - with proper sizing */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          minHeight: '48px',
        }}
      >
        <svg
          viewBox={asset.viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{
            width: '100%',
            height: '100%',
            maxHeight: '48px',
            color: isSelected ? '#4338ca' : '#333',
          }}
        >
          <g dangerouslySetInnerHTML={{ __html: asset.svgContent }} />
        </svg>
      </div>
      {/* Asset name */}
      <span
        style={{
          fontSize: '9px',
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? '#4338ca' : '#666',
          textAlign: 'center',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {asset.name}
      </span>
    </button>
  );
};

