import { useState, useCallback } from 'react';
import type { ToolbarStyle, Point } from '../types';
import { themes } from '../../../theme';

// ============================================================================
// Types
// ============================================================================

interface EditingTool {
  id: string;
  name: string;
  shortcut: string;
  icon: React.FC<{ size?: number }>;
  action: string;
  enabled?: boolean;
  requiresSelection?: boolean;
  minSelection?: number;
}

interface EditingToolsPanelProps {
  visible: boolean;
  toolbarStyle?: ToolbarStyle;
  hasSelection: boolean;
  selectionCount: number;
  selectedShapeTypes: string[];
  onClose?: () => void;
  // Actions
  onCopy?: () => void;
  onMove?: () => void;
  onOffset?: () => void;
  onTrim?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onScale?: () => void;
  onJoin?: () => void;
  onRotate?: (angle: number) => void;
  onMirror?: (axis: { point1: Point; point2: Point }) => void;
  onFillet?: (radius: number) => void;
  onChamfer?: () => void;
  onExplode?: () => void;
  onExtend?: () => void;
  onAlign?: (alignment: string) => void;
  onBoolean?: (operation: string) => void;
  onArray?: () => void;
  onBucket?: () => void;
  onBreak?: () => void;
  onDivide?: () => void;
}

// ============================================================================
// SVG Icons - Matching the mockup style
// ============================================================================

const CopyIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" strokeLinecap="round" />
  </svg>
);

const MoveIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2v20M2 12h20" />
    <path d="M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const OffsetIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 8c0-2 2-4 8-4s8 2 8 4" />
    <path d="M4 16c0 2 2 4 8 4s8-2 8-4" strokeDasharray="3 2" />
    <path d="M8 8v8M16 8v8" strokeLinecap="round" />
  </svg>
);

const TrimIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M8.5 8.5L20 20M8.5 15.5L20 4" strokeLinecap="round" />
  </svg>
);

const GroupIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3" />
  </svg>
);

const UngroupIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <path d="M9 12h6M12 9v6" strokeLinecap="round" strokeDasharray="2 2" opacity="0.5" />
  </svg>
);

const BlockIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 9h16M9 9v11" />
    <circle cx="6.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);

const UnblockIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 2" />
    <path d="M4 9h16M9 9v11" strokeDasharray="3 2" />
    <path d="M2 2l20 20" strokeWidth="2" />
  </svg>
);

const ScaleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="8" y="8" width="12" height="12" rx="1" />
    <rect x="4" y="4" width="8" height="8" rx="1" strokeDasharray="2 2" opacity="0.5" />
    <path d="M4 4l4 4" strokeLinecap="round" />
  </svg>
);

const JoinIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 12h6M14 12h6" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M4 8v8M20 8v8" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const RotateIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3a9 9 0 1 0 9 9" />
    <path d="M12 3l4 4M12 3l4-2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(15 12 12)" opacity="0.5" />
  </svg>
);

const MirrorIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 3v18" strokeDasharray="3 2" />
    <polygon points="5,8 9,8 7,16 5,16" fill="currentColor" opacity="0.3" stroke="currentColor" />
    <polygon points="19,8 15,8 17,16 19,16" fill="currentColor" opacity="0.3" stroke="currentColor" />
    <path d="M9 10h1M14 10h1" strokeLinecap="round" opacity="0.5" />
  </svg>
);

const FilletIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 20V10" strokeLinecap="round" />
    <path d="M4 10a6 6 0 0 1 6-6h10" strokeLinecap="round" />
    <circle cx="4" cy="10" r="2" fill="currentColor" opacity="0.3" />
  </svg>
);

const ChamferIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 20V12L12 4h8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="4" cy="12" r="2" fill="currentColor" opacity="0.3" />
    <circle cx="12" cy="4" r="2" fill="currentColor" opacity="0.3" />
  </svg>
);

const ExplodeIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" />
    <path d="M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3" strokeLinecap="round" />
  </svg>
);

const ExtendIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 12h12" strokeLinecap="round" />
    <path d="M12 12l4 4M12 12l4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 4v16" strokeDasharray="3 2" />
  </svg>
);

const AlignIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="4" y="6" width="6" height="4" rx="1" />
    <rect x="4" y="14" width="10" height="4" rx="1" />
    <path d="M4 4v16" strokeLinecap="round" />
  </svg>
);

const BooleanIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="9" cy="12" r="5" />
    <circle cx="15" cy="12" r="5" />
    <path d="M12 8.5v7" fill="currentColor" opacity="0.3" />
  </svg>
);

const ArrayIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="5" height="5" rx="1" />
    <rect x="10" y="3" width="5" height="5" rx="1" opacity="0.7" />
    <rect x="17" y="3" width="4" height="5" rx="1" opacity="0.4" />
    <rect x="3" y="10" width="5" height="5" rx="1" opacity="0.7" />
    <rect x="10" y="10" width="5" height="5" rx="1" opacity="0.5" />
    <rect x="3" y="17" width="5" height="4" rx="1" opacity="0.4" />
  </svg>
);

const BucketIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M19 11c0 5-3.5 9-7 9s-7-4-7-9l7-7 7 7z" fill="currentColor" opacity="0.2" />
    <path d="M19 11c0 5-3.5 9-7 9s-7-4-7-9l7-7 7 7z" />
    <path d="M12 4l3 3" strokeLinecap="round" />
  </svg>
);

const BreakIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 12h6M14 12h6" strokeLinecap="round" />
    <path d="M10 8l2 4-2 4M14 8l-2 4 2 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DivideIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 12h16" strokeLinecap="round" />
    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <circle cx="18" cy="12" r="1.5" fill="currentColor" />
    <path d="M12 6v2M12 16v2" strokeLinecap="round" strokeDasharray="2 2" opacity="0.5" />
  </svg>
);

// ============================================================================
// Tool Definitions
// ============================================================================

const EDITING_TOOLS: EditingTool[] = [
  // Row 1
  { id: 'copy', name: 'Copy', shortcut: 'CC', icon: CopyIcon, action: 'copy', requiresSelection: true },
  { id: 'mirror', name: 'Mirror', shortcut: 'MI', icon: MirrorIcon, action: 'mirror', requiresSelection: true },
  // Row 2
  { id: 'move', name: 'Move', shortcut: 'MM', icon: MoveIcon, action: 'move', requiresSelection: true },
  { id: 'fillet', name: 'Fillet', shortcut: 'CF', icon: FilletIcon, action: 'fillet', requiresSelection: true, minSelection: 2 },
  // Row 3
  { id: 'offset', name: 'Offset', shortcut: 'OO', icon: OffsetIcon, action: 'offset', requiresSelection: true },
  { id: 'chamfer', name: 'Chamfer', shortcut: 'CH', icon: ChamferIcon, action: 'chamfer', requiresSelection: true, minSelection: 2, enabled: false },
  // Row 4
  { id: 'trim', name: 'Trim', shortcut: 'TR', icon: TrimIcon, action: 'trim' },
  { id: 'explode', name: 'Explode', shortcut: 'X', icon: ExplodeIcon, action: 'explode', requiresSelection: true },
  // Row 5
  { id: 'group', name: 'Group', shortcut: '⌘G', icon: GroupIcon, action: 'group', requiresSelection: true, minSelection: 2 },
  { id: 'extend', name: 'Extend', shortcut: 'TX', icon: ExtendIcon, action: 'extend', requiresSelection: true, enabled: false },
  // Row 6
  { id: 'ungroup', name: 'Ungroup', shortcut: '⌘⇧G', icon: UngroupIcon, action: 'ungroup', requiresSelection: true },
  { id: 'align', name: 'Align', shortcut: 'AL', icon: AlignIcon, action: 'align', requiresSelection: true, minSelection: 2, enabled: false },
  // Row 7
  { id: 'block', name: 'Block', shortcut: '⌘B', icon: BlockIcon, action: 'block', requiresSelection: true, enabled: false },
  { id: 'boolean', name: 'Boolean', shortcut: 'BO', icon: BooleanIcon, action: 'boolean', requiresSelection: true, minSelection: 2, enabled: false },
  // Row 8
  { id: 'unblock', name: 'Unblock', shortcut: '⌘⇧B', icon: UnblockIcon, action: 'unblock', requiresSelection: true, enabled: false },
  { id: 'array', name: 'Array', shortcut: 'AR', icon: ArrayIcon, action: 'array', requiresSelection: true, enabled: false },
  // Row 9
  { id: 'scale', name: 'Scale', shortcut: 'SC', icon: ScaleIcon, action: 'scale', requiresSelection: true, enabled: false },
  { id: 'bucket', name: 'Bucket', shortcut: 'BB', icon: BucketIcon, action: 'bucket', enabled: false },
  // Row 10
  { id: 'join', name: 'Join', shortcut: 'J', icon: JoinIcon, action: 'join', requiresSelection: true, minSelection: 2, enabled: false },
  { id: 'break', name: 'Break', shortcut: 'BR', icon: BreakIcon, action: 'break', requiresSelection: true, enabled: false },
  // Row 11
  { id: 'rotate', name: 'Rotate', shortcut: 'RR', icon: RotateIcon, action: 'rotate', requiresSelection: true },
  { id: 'divide', name: 'Divide', shortcut: 'DD', icon: DivideIcon, action: 'divide', requiresSelection: true, enabled: false },
];

// ============================================================================
// Theme Styles
// ============================================================================

const getPanelStyles = (toolbarStyle: ToolbarStyle = 'modern') => {
  const theme = themes[toolbarStyle];
  
  const baseStyles = {
    panel: {
      backgroundColor: theme.colors.bg,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: toolbarStyle === 'windows95' ? '0' : '12px',
      boxShadow: toolbarStyle === 'windows95' 
        ? 'inset -1px -1px 0 #000, inset 1px 1px 0 #fff'
        : '0 8px 32px rgba(0, 0, 0, 0.3)',
      fontFamily: theme.fontFamily,
    },
    header: {
      color: theme.colors.text,
      borderBottom: `1px solid ${theme.colors.border}`,
      backgroundColor: toolbarStyle === 'windows95' ? '#000080' : 'transparent',
    },
    headerText: {
      color: toolbarStyle === 'windows95' ? '#fff' : theme.colors.textMuted,
      fontSize: toolbarStyle === 'windows95' ? '11px' : '11px',
      fontWeight: toolbarStyle === 'windows95' ? 'bold' : '500',
      letterSpacing: '0.5px',
    },
    toolButton: {
      backgroundColor: 'transparent',
      border: toolbarStyle === 'windows95' 
        ? '1px solid transparent'
        : '1px solid transparent',
      borderRadius: toolbarStyle === 'windows95' ? '0' : '8px',
      color: theme.colors.text,
    },
    toolButtonHover: {
      backgroundColor: theme.colors.bgHover,
      borderColor: toolbarStyle === 'windows95' ? '#808080' : theme.colors.border,
    },
    toolButtonDisabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    shortcut: {
      color: theme.colors.textMuted,
      fontSize: '10px',
      fontFamily: 'monospace',
    },
    toolName: {
      color: theme.colors.text,
      fontSize: '11px',
    },
  };

  return baseStyles;
};

// ============================================================================
// Component
// ============================================================================

export const EditingToolsPanel: React.FC<EditingToolsPanelProps> = ({
  visible,
  toolbarStyle = 'modern',
  hasSelection,
  selectionCount,
  selectedShapeTypes,
  onClose,
  onCopy,
  onMove,
  onOffset,
  onTrim,
  onGroup,
  onUngroup,
  onBlock,
  onUnblock,
  onScale,
  onJoin,
  onRotate,
  onMirror,
  onFillet,
  onChamfer,
  onExplode,
  onExtend,
  onAlign,
  onBoolean,
  onArray,
  onBucket,
  onBreak,
  onDivide,
}) => {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const styles = getPanelStyles(toolbarStyle);

  const isToolEnabled = useCallback((tool: EditingTool): boolean => {
    // Check if tool is explicitly disabled (not implemented)
    if (tool.enabled === false) return false;
    
    // Check selection requirements
    if (tool.requiresSelection && !hasSelection) return false;
    if (tool.minSelection && selectionCount < tool.minSelection) return false;
    
    // Special cases
    if (tool.id === 'ungroup') {
      return selectedShapeTypes.includes('group');
    }
    if (tool.id === 'explode') {
      return selectedShapeTypes.some(t => ['polyline', 'rectangle', 'curve', 'group'].includes(t));
    }
    
    return true;
  }, [hasSelection, selectionCount, selectedShapeTypes]);

  const handleToolClick = useCallback((tool: EditingTool) => {
    if (!isToolEnabled(tool)) return;
    
    switch (tool.action) {
      case 'copy': onCopy?.(); break;
      case 'move': onMove?.(); break;
      case 'offset': onOffset?.(); break;
      case 'trim': onTrim?.(); break;
      case 'group': onGroup?.(); break;
      case 'ungroup': onUngroup?.(); break;
      case 'block': onBlock?.(); break;
      case 'unblock': onUnblock?.(); break;
      case 'scale': onScale?.(); break;
      case 'join': onJoin?.(); break;
      case 'rotate': onRotate?.(90); break; // Default 90° rotation
      case 'mirror': 
        // Default horizontal mirror through selection center
        onMirror?.({ point1: { x: 0, y: 0 }, point2: { x: 0, y: 1 } }); 
        break;
      case 'fillet': onFillet?.(0.1); break; // Default 0.1m radius
      case 'chamfer': onChamfer?.(); break;
      case 'explode': onExplode?.(); break;
      case 'extend': onExtend?.(); break;
      case 'align': onAlign?.('left'); break;
      case 'boolean': onBoolean?.('union'); break;
      case 'array': onArray?.(); break;
      case 'bucket': onBucket?.(); break;
      case 'break': onBreak?.(); break;
      case 'divide': onDivide?.(); break;
    }
  }, [
    isToolEnabled, onCopy, onMove, onOffset, onTrim, onGroup, onUngroup,
    onBlock, onUnblock, onScale, onJoin, onRotate, onMirror, onFillet,
    onChamfer, onExplode, onExtend, onAlign, onBoolean, onArray,
    onBucket, onBreak, onDivide
  ]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '60px',
        right: '16px',
        width: '280px',
        zIndex: 1000,
        ...styles.panel,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          ...styles.header,
        }}
      >
        <span style={styles.headerText}>Editing tools</span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: styles.headerText.color,
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Tools Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '2px',
          padding: '8px',
        }}
      >
        {EDITING_TOOLS.map((tool) => {
          const enabled = isToolEnabled(tool);
          const isHovered = hoveredTool === tool.id;
          const Icon = tool.icon;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              disabled={!enabled}
              title={`${tool.name} (${tool.shortcut})${!enabled ? ' - Not available' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                cursor: enabled ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                ...styles.toolButton,
                ...(isHovered && enabled ? styles.toolButtonHover : {}),
                ...((!enabled) ? styles.toolButtonDisabled : {}),
              }}
            >
              <Icon size={18} />
              <span style={styles.toolName}>{tool.name}</span>
              <span style={{ marginLeft: 'auto', ...styles.shortcut }}>{tool.shortcut}</span>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: `1px solid ${themes[toolbarStyle].colors.border}`,
          fontSize: '10px',
          color: themes[toolbarStyle].colors.textMuted,
          textAlign: 'center',
        }}
      >
        {hasSelection 
          ? `${selectionCount} shape${selectionCount > 1 ? 's' : ''} selected`
          : 'Select shapes to enable tools'
        }
      </div>
    </div>
  );
};

export default EditingToolsPanel;

