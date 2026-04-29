import type { OpeningPlacementOptions, WorkspaceCommand, WorkspaceCommandBus } from './core';
import type {
  Point,
  ToolType,
  GuidelineOrientation,
  WallAlignment,
  DrawingMode,
  WallOffsetDirection,
  OpeningCategory,
  OpeningOperation,
  OpeningSwingDirection,
  OpeningHingeSide,
} from '../../components/Workspace/types';

type PrimitiveType = 'string' | 'number' | 'boolean' | 'point' | 'string_array' | 'enum';

export interface ToolParameterDefinition {
  name: string;
  type: PrimitiveType;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface WorkspaceToolDefinition<TType extends WorkspaceCommand['type'] = WorkspaceCommand['type']> {
  name: string;
  description: string;
  parameters: ToolParameterDefinition[];
  commandType: TType;
  buildCommand: (args: Record<string, unknown>) => Extract<WorkspaceCommand, { type: TType }>;
}

const defineWorkspaceTool = (
  commandType: WorkspaceCommand['type'],
  definition: Omit<WorkspaceToolDefinition, 'commandType'>
): WorkspaceToolDefinition => ({
  ...definition,
  commandType,
});

const requireNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Field "${field}" must be a valid number.`);
  }
  return value;
};

const requireString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Field "${field}" must be a non-empty string.`);
  }
  return value;
};

const requirePoint = (value: unknown, field: string): Point => {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as Point).x !== 'number' ||
    typeof (value as Point).y !== 'number'
  ) {
    throw new Error(`Field "${field}" must be an object with numeric "x" and "y".`);
  }
  return value as Point;
};

const requirePointArray = (value: unknown, field: string): Point[] => {
  const parsedValue = (() => {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      try {
        const parsed = JSON.parse(value);
        return parsed;
      } catch {
        throw new Error(`Field "${field}" must be valid JSON when provided as a string.`);
      }
    }
    return value;
  })();

  if (!Array.isArray(parsedValue)) {
    throw new Error(`Field "${field}" must be an array of points.`);
  }

  parsedValue.forEach((entry, index) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as Point).x !== 'number' ||
      typeof (entry as Point).y !== 'number'
    ) {
      throw new Error(`Field "${field}" entry at index ${index} is not a valid point.`);
    }
  });

  return parsedValue as Point[];
};

const requireStringArray = (value: unknown, field: string): string[] => {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Field "${field}" must be an array of strings.`);
  }
  return value as string[];
};

const requireEnum = <T extends string>(value: unknown, field: string, allowed: readonly T[]): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`Field "${field}" must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
};

const parseMetadataRecord = (
  value: unknown,
  field: string
): Record<string, string | number | boolean | null> | undefined => {
  if (value == null) {
    return undefined;
  }
  let raw: unknown = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      throw new Error(`Field "${field}" must be valid JSON when provided as a string.`);
    }
  }
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Field "${field}" must be an object or JSON string.`);
  }
  const entries = Object.entries(raw as Record<string, unknown>);
  return entries.reduce<Record<string, string | number | boolean | null>>((acc, [key, entryValue]) => {
    if (
      typeof entryValue === 'string' ||
      typeof entryValue === 'number' ||
      typeof entryValue === 'boolean' ||
      entryValue === null
    ) {
      acc[key] = entryValue;
    } else {
      throw new Error(`Field "${field}" entry "${key}" must be a primitive or null.`);
    }
    return acc;
  }, {});
};

const parseOpeningOptions = (args: Record<string, unknown>): OpeningPlacementOptions | undefined => {
  const options: OpeningPlacementOptions = {};
  let hasOption = false;
  const setOption = <K extends keyof OpeningPlacementOptions>(key: K, value: OpeningPlacementOptions[K]) => {
    options[key] = value;
    hasOption = true;
  };

  if (typeof args.wallId === 'string') {
    setOption('wallId', requireString(args.wallId, 'wallId'));
  }
  if (typeof args.category === 'string') {
    setOption('category', requireEnum<OpeningCategory>(args.category, 'category', ['door', 'window', 'opening']));
  }
  if (typeof args.width === 'number') {
    setOption('width', requireNumber(args.width, 'width'));
  }
  if (typeof args.height === 'number') {
    setOption('height', requireNumber(args.height, 'height'));
  }
  if (typeof args.sillHeight === 'number') {
    setOption('sillHeight', requireNumber(args.sillHeight, 'sillHeight'));
  }
  if (typeof args.headHeight === 'number') {
    setOption('headHeight', requireNumber(args.headHeight, 'headHeight'));
  }
  if (typeof args.frameThickness === 'number') {
    setOption('frameThickness', requireNumber(args.frameThickness, 'frameThickness'));
  }
  if (typeof args.autoAttach === 'boolean') {
    setOption('autoAttach', args.autoAttach);
  }
  if (typeof args.normalOffset === 'number') {
    setOption('normalOffset', requireNumber(args.normalOffset, 'normalOffset'));
  }
  if (typeof args.facing === 'string') {
    const facing = requireEnum<'positive' | 'negative'>(args.facing, 'facing', ['positive', 'negative']);
    setOption('facing', facing);
  }

  const swing: Partial<OpeningPlacementOptions['swing']> = {};
  let hasSwing = false;
  if (typeof args.swingOperation === 'string') {
    swing.operation = requireEnum<OpeningOperation>(args.swingOperation, 'swingOperation', ['swing', 'slide', 'fixed']);
    hasSwing = true;
  }
  if (typeof args.swingDirection === 'string') {
    swing.direction = requireEnum<OpeningSwingDirection>(args.swingDirection, 'swingDirection', ['in', 'out', 'center']);
    hasSwing = true;
  }
  if (typeof args.hinge === 'string') {
    swing.hinge = requireEnum<OpeningHingeSide>(args.hinge, 'hinge', ['left', 'right', 'double', 'none']);
    hasSwing = true;
  }
  if (typeof args.swingAngle === 'number') {
    swing.angle = requireNumber(args.swingAngle, 'swingAngle');
    hasSwing = true;
  }
  if (typeof args.swingFlipped === 'boolean') {
    swing.flipped = args.swingFlipped;
    hasSwing = true;
  }
  if (typeof args.facing === 'string') {
    swing.facing = requireEnum<'positive' | 'negative'>(args.facing, 'facing', ['positive', 'negative']);
    hasSwing = true;
  }
  if (hasSwing) {
    setOption('swing', swing);
  }

  const metadata = parseMetadataRecord(args.metadata, 'metadata');
  if (metadata) {
    setOption('metadata', metadata);
  }

  return hasOption ? options : undefined;
};

export const workspaceTools: WorkspaceToolDefinition[] = [
  defineWorkspaceTool('workspace/select_tool', {
    name: 'workspace.select_tool',
    description: 'Switch the active drawing tool.',
    parameters: [
      {
        name: 'tool',
        type: 'enum',
        description: 'Any toolbar tool identifier (e.g., select, line, rectangle).',
        required: true,
        enum: [
          'select',
          'zoom',
          'line',
          'polyline',
          'arc',
          'curve',
          'circle',
          'rectangle',
          'guideline',
          'trim',
          'wall',
          'opening',
          'pencil',
          'text',
          'arrow',
          'highlighter',
          'eraser',
          'note',
          'upload',
          'zone',
        ],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/select_tool',
      tool: requireEnum<ToolType>(args.tool, 'tool', [
        'select',
        'zoom',
        'line',
        'polyline',
        'arc',
        'curve',
        'circle',
        'rectangle',
        'guideline',
        'trim',
        'wall',
        'opening',
        'pencil',
        'text',
        'arrow',
        'highlighter',
        'eraser',
        'note',
        'upload',
        'zone',
      ]),
    }),
  }),
  defineWorkspaceTool('workspace/set_guideline_orientation', {
    name: 'workspace.set_guideline_orientation',
    description: 'Set the guideline orientation before placing a guideline.',
    parameters: [
      {
        name: 'orientation',
        type: 'enum',
        description: 'Guideline orientation mode.',
        required: true,
        enum: ['horizontal', 'vertical', 'freeform'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/set_guideline_orientation',
      orientation: requireEnum<GuidelineOrientation>(args.orientation, 'orientation', [
        'horizontal',
        'vertical',
        'freeform',
      ]),
    }),
  }),
  defineWorkspaceTool('workspace/set_drawing_mode', {
    name: 'workspace.set_drawing_mode',
    description: 'Switch between one-time and chain drawing modes.',
    parameters: [
      {
        name: 'mode',
        type: 'enum',
        description: 'Desired drawing mode.',
        required: true,
        enum: ['one-time', 'chain'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/set_drawing_mode',
      mode: requireEnum<DrawingMode>(args.mode, 'mode', ['one-time', 'chain']),
    }),
  }),
  defineWorkspaceTool('workspace/set_show_measurements', {
    name: 'workspace.set_show_measurements',
    description: 'Toggle or set the visibility of measurement dimensions on the canvas.',
    parameters: [
      {
        name: 'show',
        type: 'boolean',
        description: 'Whether to show measurements (true) or hide them (false).',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/set_show_measurements',
      show: Boolean(args.show),
    }),
  }),
  defineWorkspaceTool('workspace/set_walls_locked', {
    name: 'workspace.set_walls_locked',
    description: 'Toggle or set whether connected walls are locked together for coordinated resizing.',
    parameters: [
      {
        name: 'locked',
        type: 'boolean',
        description: 'Whether walls should be locked (true) or unlocked (false).',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/set_walls_locked',
      locked: Boolean(args.locked),
    }),
  }),
  defineWorkspaceTool('workspace/click', {
    name: 'workspace.click',
    description: 'Simulate a canvas click at a specific coordinate.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Canvas coordinate where the click occurs.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/click',
      point: requirePoint(args.point, 'point'),
    }),
  }),
  defineWorkspaceTool('workspace/update_cursor', {
    name: 'workspace.update_cursor',
    description: 'Update the cursor position (used for previews/snapping).',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Current cursor coordinate.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/update_cursor',
      point: requirePoint(args.point, 'point'),
    }),
  }),
  defineWorkspaceTool('workspace/select_shapes', {
    name: 'workspace.select_shapes',
    description: 'Replace the current selection with specific shape IDs.',
    parameters: [
      {
        name: 'ids',
        type: 'string_array',
        description: 'Array of shape IDs to select. Empty array clears selection.',
        required: true,
      },
      {
        name: 'append',
        type: 'boolean',
        description: 'Set to true to append to the existing selection.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/select_shapes',
      ids: requireStringArray(args.ids, 'ids'),
      append: Boolean(args.append),
    }),
  }),
  defineWorkspaceTool('workspace/move_selection', {
    name: 'workspace.move_selection',
    description: 'Move the current selection by a delta vector.',
    parameters: [
      {
        name: 'delta',
        type: 'point',
        description: 'Delta to apply to the selection (x,y).',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/move_selection',
      delta: requirePoint(args.delta, 'delta'),
    }),
  }),
  defineWorkspaceTool('workspace/delete_selection', {
    name: 'workspace.delete_selection',
    description: 'Delete all currently selected shapes.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/delete_selection',
    }),
  }),
  defineWorkspaceTool('workspace/resize_line_handle', {
    name: 'workspace.resize_line_handle',
    description: 'Resize the active line by dragging one of its handles.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'New coordinate for the dragged handle.',
        required: true,
      },
      {
        name: 'handle',
        type: 'enum',
        description: 'Which line endpoint is being moved.',
        required: true,
        enum: ['start', 'end'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/resize_line_handle',
      point: requirePoint(args.point, 'point'),
      handle: requireEnum<'start' | 'end'>(args.handle, 'handle', ['start', 'end']),
    }),
  }),
  defineWorkspaceTool('workspace/resize_polyline_corner', {
    name: 'workspace.resize_polyline_corner',
    description: 'Resize a selection by dragging one of the bounding corners.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Target coordinate for the dragged corner.',
        required: true,
      },
      {
        name: 'corner',
        type: 'enum',
        description: 'Corner identifier (top-left, top-right, bottom-left, bottom-right).',
        required: true,
        enum: ['tl', 'tr', 'bl', 'br'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/resize_polyline_corner',
      point: requirePoint(args.point, 'point'),
      corner: requireEnum<'tl' | 'tr' | 'bl' | 'br'>(args.corner, 'corner', ['tl', 'tr', 'bl', 'br']),
    }),
  }),
  defineWorkspaceTool('workspace/resize_rectangle_edge', {
    name: 'workspace.resize_rectangle_edge',
    description: 'Move one edge of the currently selected rectangle.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'New coordinate for the edge position.',
        required: true,
      },
      {
        name: 'edge',
        type: 'enum',
        description: 'Which edge is being moved.',
        required: true,
        enum: ['top', 'right', 'bottom', 'left'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/resize_rectangle_edge',
      point: requirePoint(args.point, 'point'),
      edge: requireEnum<'top' | 'right' | 'bottom' | 'left'>(args.edge, 'edge', ['top', 'right', 'bottom', 'left']),
    }),
  }),
  defineWorkspaceTool('workspace/resize_room_corner', {
    name: 'workspace.resize_room_corner',
    description: 'Move a specific corner handle of the selected room.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'New coordinate for the dragged corner.',
        required: true,
      },
      {
        name: 'corner',
        type: 'enum',
        description: 'Which corner is being moved (top-left, etc.).',
        required: true,
        enum: ['tl', 'tr', 'bl', 'br'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/resize_room_corner',
      point: requirePoint(args.point, 'point'),
      corner: requireEnum<'tl' | 'tr' | 'bl' | 'br'>(args.corner, 'corner', ['tl', 'tr', 'bl', 'br']),
    }),
  }),
  defineWorkspaceTool('workspace/confirm_current_shape', {
    name: 'workspace.confirm_current_shape',
    description: 'Commit the shape that is currently being drawn.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/confirm_current_shape',
    }),
  }),
  defineWorkspaceTool('workspace/commit_chain_session', {
    name: 'workspace.commit_chain_session',
    description: 'Finalize a chain drawing session by selecting all created shapes.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/commit_chain_session',
    }),
  }),
  defineWorkspaceTool('workspace/abort_chain_session', {
    name: 'workspace.abort_chain_session',
    description: 'Abort the current chain drawing session and discard pending shapes.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/abort_chain_session',
    }),
  }),
  defineWorkspaceTool('workspace/cancel_drawing', {
    name: 'workspace.cancel_drawing',
    description: 'Cancel the active drawing preview without committing it.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/cancel_drawing',
    }),
  }),
  defineWorkspaceTool('workspace/history_begin_batch', {
    name: 'workspace.history_begin_batch',
    description: 'Start grouping subsequent workspace mutations into a single undo step.',
    parameters: [
      {
        name: 'source',
        type: 'string',
        description: 'Optional identifier describing the gesture or tool initiating the batch.',
        required: false,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/history_begin_batch',
      source: typeof args.source === 'string' ? args.source : undefined,
    }),
  }),
  defineWorkspaceTool('workspace/history_commit_batch', {
    name: 'workspace.history_commit_batch',
    description: 'Commit the current grouped workspace mutations as one undo step.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/history_commit_batch',
    }),
  }),
  defineWorkspaceTool('workspace/history_cancel_batch', {
    name: 'workspace.history_cancel_batch',
    description: 'Cancel the current grouped workspace mutations and revert to the snapshot taken at batch start.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/history_cancel_batch',
    }),
  }),
  defineWorkspaceTool('workspace/undo', {
    name: 'workspace.undo',
    description: 'Undo the last workspace action.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/undo',
    }),
  }),
  defineWorkspaceTool('workspace/redo', {
    name: 'workspace.redo',
    description: 'Redo the previously undone action.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/redo',
    }),
  }),
  defineWorkspaceTool('workspace/wall_begin', {
    name: 'workspace.wall_begin',
    description: 'Begin drawing a parametric wall from a starting point.',
    parameters: [
      {
        name: 'start',
        type: 'point',
        description: 'First point of the wall centerline.',
        required: true,
      },
      {
        name: 'thickness',
        type: 'number',
        description: 'Wall thickness in model units.',
      },
      {
        name: 'height',
        type: 'number',
        description: 'Wall height in model units.',
      },
      {
        name: 'alignment',
        type: 'enum',
        description: 'Anchor alignment for the wall.',
        enum: ['center', 'inside', 'outside'],
      },
      {
        name: 'materialId',
        type: 'string',
        description: 'Optional material identifier.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_begin',
      point: requirePoint(args.start, 'start'),
      options: {
        thickness: typeof args.thickness === 'number' ? args.thickness : undefined,
        height: typeof args.height === 'number' ? args.height : undefined,
        alignment: typeof args.alignment === 'string'
          ? requireEnum<WallAlignment>(args.alignment, 'alignment', ['center', 'inside', 'outside'])
          : undefined,
        materialId: typeof args.materialId === 'string' ? args.materialId : undefined,
      },
    }),
  }),
  defineWorkspaceTool('workspace/wall_update', {
    name: 'workspace.wall_update',
    description: 'Update the preview endpoint of the active wall.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Next point along the wall centerline.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_update',
      point: requirePoint(args.point, 'point'),
    }),
  }),
  defineWorkspaceTool('workspace/wall_commit', {
    name: 'workspace.wall_commit',
    description: 'Commit the currently previewed wall segment.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/wall_commit',
    }),
  }),
  defineWorkspaceTool('workspace/wall_cancel', {
    name: 'workspace.wall_cancel',
    description: 'Cancel the active wall drawing session.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/wall_cancel',
    }),
  }),
  defineWorkspaceTool('workspace/wall_set_thickness', {
    name: 'workspace.wall_set_thickness',
    description: 'Adjust the thickness of the active wall preview.',
    parameters: [
      {
        name: 'thickness',
        type: 'number',
        description: 'New thickness for the active wall (must be positive).',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_set_thickness',
      thickness: requireNumber(args.thickness, 'thickness'),
    }),
  }),
  defineWorkspaceTool('workspace/wall_set_alignment', {
    name: 'workspace.wall_set_alignment',
    description: 'Adjust the anchor alignment of the active wall preview.',
    parameters: [
      {
        name: 'alignment',
        type: 'enum',
        description: 'New alignment mode.',
        required: true,
        enum: ['center', 'inside', 'outside'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_set_alignment',
      alignment: requireEnum<WallAlignment>(args.alignment, 'alignment', ['center', 'inside', 'outside']),
    }),
  }),
  defineWorkspaceTool('workspace/wall_rectangle', {
    name: 'workspace.wall_rectangle',
    description: 'Draw a rectangular loop of four walls using two opposing corners.',
    parameters: [
      {
        name: 'start',
        type: 'point',
        description: 'One corner of the rectangle.',
        required: true,
      },
      {
        name: 'end',
        type: 'point',
        description: 'Opposite corner of the rectangle.',
        required: true,
      },
      {
        name: 'thickness',
        type: 'number',
        description: 'Wall thickness override in model units.',
      },
      {
        name: 'height',
        type: 'number',
        description: 'Wall height override.',
      },
      {
        name: 'alignment',
        type: 'enum',
        description: 'Anchor alignment to use when creating the walls.',
        enum: ['center', 'inside', 'outside'],
      },
      {
        name: 'materialId',
        type: 'string',
        description: 'Optional material identifier to apply.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_rectangle',
      start: requirePoint(args.start, 'start'),
      end: requirePoint(args.end, 'end'),
      options: {
        thickness: typeof args.thickness === 'number' ? args.thickness : undefined,
        height: typeof args.height === 'number' ? args.height : undefined,
        alignment: typeof args.alignment === 'string'
          ? requireEnum<WallAlignment>(args.alignment, 'alignment', ['center', 'inside', 'outside'])
          : undefined,
        materialId: typeof args.materialId === 'string' ? args.materialId : undefined,
      },
    }),
  }),
  defineWorkspaceTool('workspace/wall_offset', {
    name: 'workspace.wall_offset',
    description: 'Create a parallel wall offset from an existing segment.',
    parameters: [
      {
        name: 'wallId',
        type: 'string',
        description: 'Identifier of the source wall to offset.',
        required: true,
      },
      {
        name: 'distance',
        type: 'number',
        description: 'Positive offset distance.',
        required: true,
      },
      {
        name: 'direction',
        type: 'enum',
        description: 'Which side of the source wall to offset toward.',
        required: true,
        enum: ['left', 'right'],
      },
      {
        name: 'thickness',
        type: 'number',
        description: 'Optional override for the new wall thickness.',
      },
      {
        name: 'height',
        type: 'number',
        description: 'Optional override for the new wall height.',
      },
      {
        name: 'alignment',
        type: 'enum',
        description: 'Optional override for the wall alignment.',
        enum: ['center', 'inside', 'outside'],
      },
      {
        name: 'materialId',
        type: 'string',
        description: 'Optional override for the wall material.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_offset',
      wallId: requireString(args.wallId, 'wallId'),
      distance: requireNumber(args.distance, 'distance'),
      direction: requireEnum<WallOffsetDirection>(args.direction, 'direction', ['left', 'right']),
      options: {
        thickness: typeof args.thickness === 'number' ? args.thickness : undefined,
        height: typeof args.height === 'number' ? args.height : undefined,
        alignment: typeof args.alignment === 'string'
          ? requireEnum<WallAlignment>(args.alignment, 'alignment', ['center', 'inside', 'outside'])
          : undefined,
        materialId: typeof args.materialId === 'string' ? args.materialId : undefined,
      },
    }),
  }),
  defineWorkspaceTool('workspace/selected_wall_set_thickness', {
    name: 'workspace.selected_wall_set_thickness',
    description: 'Set the thickness of the currently selected wall.',
    parameters: [
      {
        name: 'thickness',
        type: 'number',
        description: 'New thickness applied to the selected wall.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selected_wall_set_thickness',
      thickness: requireNumber(args.thickness, 'thickness'),
    }),
  }),
  defineWorkspaceTool('workspace/selected_wall_set_height', {
    name: 'workspace.selected_wall_set_height',
    description: 'Set the height of the currently selected wall.',
    parameters: [
      {
        name: 'height',
        type: 'number',
        description: 'New height applied to the selected wall.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selected_wall_set_height',
      height: requireNumber(args.height, 'height'),
    }),
  }),
  defineWorkspaceTool('workspace/selected_wall_set_length', {
    name: 'workspace.selected_wall_set_length',
    description: 'Set the length of the currently selected wall.',
    parameters: [
      {
        name: 'length',
        type: 'number',
        description: 'Target wall length in model units.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selected_wall_set_length',
      length: requireNumber(args.length, 'length'),
    }),
  }),
  defineWorkspaceTool('workspace/selected_wall_set_alignment', {
    name: 'workspace.selected_wall_set_alignment',
    description: 'Adjust the alignment of the currently selected wall.',
    parameters: [
      {
        name: 'alignment',
        type: 'enum',
        description: 'Alignment mode to apply.',
        required: true,
        enum: ['center', 'inside', 'outside'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selected_wall_set_alignment',
      alignment: requireEnum<WallAlignment>(args.alignment, 'alignment', ['center', 'inside', 'outside']),
    }),
  }),
  defineWorkspaceTool('workspace/wall_set_control_point', {
    name: 'workspace.wall_set_control_point',
    description: 'Set or clear the control point of the selected wall to create arches.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Control point coordinate used to bend the wall. Leave empty if clearing.',
      },
      {
        name: 'clear',
        type: 'boolean',
        description: 'Enable to remove the existing control point instead of setting one.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_set_control_point',
      point: args.clear ? null : requirePoint(args.point, 'point'),
    }),
  }),
  defineWorkspaceTool('workspace/wall_resize_handle', {
    name: 'workspace.wall_resize_handle',
    description: 'Resize a wall by dragging its start or end handle.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'New coordinate for the dragged handle.',
        required: true,
      },
      {
        name: 'handle',
        type: 'enum',
        description: 'Which wall endpoint is being moved.',
        required: true,
        enum: ['start', 'end'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/wall_resize_handle',
      point: requirePoint(args.point, 'point'),
      handle: requireEnum<'start' | 'end'>(args.handle, 'handle', ['start', 'end']),
    }),
  }),
  defineWorkspaceTool('workspace/selected_opening_set_size', {
    name: 'workspace.selected_opening_set_size',
    description: 'Set the width and/or height of the selected opening.',
    parameters: [
      {
        name: 'width',
        type: 'number',
        description: 'Optional width to assign to the opening.',
      },
      {
        name: 'height',
        type: 'number',
        description: 'Optional height to assign to the opening.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selected_opening_set_size',
      width: typeof args.width === 'number' ? args.width : undefined,
      height: typeof args.height === 'number' ? args.height : undefined,
    }),
  }),
  defineWorkspaceTool('workspace/selected_opening_set_category', {
    name: 'workspace.selected_opening_set_category',
    description: 'Set the category of the selected opening.',
    parameters: [
      {
        name: 'category',
        type: 'enum',
        description: 'Opening category preset.',
        enum: ['door', 'window', 'opening'],
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selected_opening_set_category',
      category: requireEnum<OpeningCategory>(args.category, 'category', ['door', 'window', 'opening']),
    }),
  }),
  defineWorkspaceTool('workspace/opening_begin', {
    name: 'workspace.opening_begin',
    description: 'Begin placing an opening (door/window) with optional wall attachment.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Anchor point used to seed the opening placement.',
        required: true,
      },
      {
        name: 'wallId',
        type: 'string',
        description: 'Optional wall identifier to attach the opening to.',
      },
      {
        name: 'category',
        type: 'enum',
        description: 'Opening category preset.',
        enum: ['door', 'window', 'opening'],
      },
      {
        name: 'width',
        type: 'number',
        description: 'Rough opening width.',
      },
      {
        name: 'height',
        type: 'number',
        description: 'Rough opening height.',
      },
      {
        name: 'sillHeight',
        type: 'number',
        description: 'Elevation from floor to sill.',
      },
      {
        name: 'headHeight',
        type: 'number',
        description: 'Elevation from floor to head.',
      },
      {
        name: 'frameThickness',
        type: 'number',
        description: 'Frame thickness used for rendering.',
      },
      {
        name: 'swingOperation',
        type: 'enum',
        description: 'Operation mode for the opening.',
        enum: ['swing', 'slide', 'fixed'],
      },
      {
        name: 'swingDirection',
        type: 'enum',
        description: 'Swing direction relative to the wall.',
        enum: ['in', 'out', 'center'],
      },
      {
        name: 'hinge',
        type: 'enum',
        description: 'Hinge side or configuration.',
        enum: ['left', 'right', 'double', 'none'],
      },
      {
        name: 'swingAngle',
        type: 'number',
        description: 'Swing angle in degrees.',
      },
      {
        name: 'swingFlipped',
        type: 'boolean',
        description: 'Whether the hinge orientation is flipped.',
      },
      {
        name: 'facing',
        type: 'enum',
        description: 'Preferred facing relative to the wall normal.',
        enum: ['positive', 'negative'],
      },
      {
        name: 'autoAttach',
        type: 'boolean',
        description: 'If false, skip automatic wall detection.',
      },
      {
        name: 'normalOffset',
        type: 'number',
        description: 'Offset distance from the wall centerline.',
      },
      {
        name: 'metadata',
        type: 'string',
        description: 'JSON blob of metadata tags (e.g., {"tag":"A1"}).',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/opening_begin',
      point: requirePoint(args.point, 'point'),
      options: parseOpeningOptions(args),
    }),
  }),
  defineWorkspaceTool('workspace/opening_update', {
    name: 'workspace.opening_update',
    description: 'Update the preview position for the active opening.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Point used to update the preview anchor.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/opening_update',
      point: requirePoint(args.point, 'point'),
    }),
  }),
  defineWorkspaceTool('workspace/opening_commit', {
    name: 'workspace.opening_commit',
    description: 'Commit the currently previewed opening.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/opening_commit',
    }),
  }),
  defineWorkspaceTool('workspace/opening_cancel', {
    name: 'workspace.opening_cancel',
    description: 'Cancel the active opening placement session.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/opening_cancel',
    }),
  }),
  defineWorkspaceTool('workspace/opening_insert', {
    name: 'workspace.opening_insert',
    description: 'Insert an opening in a single step with optional wall attachment.',
    parameters: [
      {
        name: 'point',
        type: 'point',
        description: 'Anchor point where the opening should be created.',
        required: true,
      },
      {
        name: 'wallId',
        type: 'string',
        description: 'Optional wall identifier to host the opening.',
      },
      {
        name: 'category',
        type: 'enum',
        description: 'Opening category preset.',
        enum: ['door', 'window', 'opening'],
      },
      {
        name: 'width',
        type: 'number',
        description: 'Rough opening width.',
      },
      {
        name: 'height',
        type: 'number',
        description: 'Rough opening height.',
      },
      {
        name: 'sillHeight',
        type: 'number',
        description: 'Elevation from floor to sill.',
      },
      {
        name: 'headHeight',
        type: 'number',
        description: 'Elevation from floor to head.',
      },
      {
        name: 'frameThickness',
        type: 'number',
        description: 'Frame thickness used for rendering.',
      },
      {
        name: 'swingOperation',
        type: 'enum',
        description: 'Operation mode for the opening.',
        enum: ['swing', 'slide', 'fixed'],
      },
      {
        name: 'swingDirection',
        type: 'enum',
        description: 'Swing direction relative to the wall.',
        enum: ['in', 'out', 'center'],
      },
      {
        name: 'hinge',
        type: 'enum',
        description: 'Hinge side or configuration.',
        enum: ['left', 'right', 'double', 'none'],
      },
      {
        name: 'swingAngle',
        type: 'number',
        description: 'Swing angle in degrees.',
      },
      {
        name: 'swingFlipped',
        type: 'boolean',
        description: 'Whether the hinge orientation is flipped.',
      },
      {
        name: 'facing',
        type: 'enum',
        description: 'Preferred facing relative to the wall normal.',
        enum: ['positive', 'negative'],
      },
      {
        name: 'autoAttach',
        type: 'boolean',
        description: 'If false, skip automatic wall detection.',
      },
      {
        name: 'normalOffset',
        type: 'number',
        description: 'Offset distance from the wall centerline.',
      },
      {
        name: 'metadata',
        type: 'string',
        description: 'JSON blob of metadata tags (e.g., {"tag":"A1"}).',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/opening_insert',
      point: requirePoint(args.point, 'point'),
      options: parseOpeningOptions(args),
    }),
  }),
  defineWorkspaceTool('workspace/create_room', {
    name: 'workspace.create_room',
    description: 'Create a room polygon from a list of points.',
    parameters: [
      {
        name: 'points',
        type: 'string',
        description: 'JSON array of points (e.g., [{"x":0,"y":0}, {"x":4,"y":0}, {"x":4,"y":3}]).',
        required: true,
      },
      {
        name: 'label',
        type: 'string',
        description: 'Optional room label.',
      },
    ],
    buildCommand: (args) => {
      const points = requirePointArray(args.points, 'points');
      if (points.length < 3) {
        throw new Error('Field "points" must contain at least three coordinates.');
      }
      return {
        type: 'workspace/create_room',
        points,
        label: typeof args.label === 'string' && args.label.trim().length > 0 ? args.label : undefined,
      };
    },
  }),
  defineWorkspaceTool('workspace/create_wall', {
    name: 'workspace.create_wall',
    description: 'Create and commit a wall between two points in a single command.',
    parameters: [
      {
        name: 'start',
        type: 'point',
        description: 'Start of the wall centerline.',
        required: true,
      },
      {
        name: 'end',
        type: 'point',
        description: 'End of the wall centerline.',
        required: true,
      },
      {
        name: 'thickness',
        type: 'number',
        description: 'Wall thickness in model units.',
      },
      {
        name: 'height',
        type: 'number',
        description: 'Wall height in model units.',
      },
      {
        name: 'alignment',
        type: 'enum',
        description: 'Anchor alignment.',
        enum: ['center', 'inside', 'outside'],
      },
      {
        name: 'materialId',
        type: 'string',
        description: 'Optional material identifier.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/create_wall',
      start: requirePoint(args.start, 'start'),
      end: requirePoint(args.end, 'end'),
      options: {
        thickness: typeof args.thickness === 'number' ? args.thickness : undefined,
        height: typeof args.height === 'number' ? args.height : undefined,
        alignment: typeof args.alignment === 'string'
          ? requireEnum<WallAlignment>(args.alignment, 'alignment', ['center', 'inside', 'outside'])
          : undefined,
        materialId: typeof args.materialId === 'string' ? args.materialId : undefined,
      },
    }),
  }),
  defineWorkspaceTool('workspace/selected_room_set_label', {
    name: 'workspace.selected_room_set_label',
    description: 'Set the label of the currently selected room.',
    parameters: [
      {
        name: 'label',
        type: 'string',
        description: 'Label text; leave empty to clear.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selected_room_set_label',
      label: typeof args.label === 'string' ? args.label : null,
    }),
  }),
  defineWorkspaceTool('workspace/zone_commit', {
    name: 'workspace.zone_commit',
    description: 'Commit the currently previewed zone polygon.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/zone_commit',
    }),
  }),
  // Universal styling tools
  defineWorkspaceTool('workspace/shape_set_fill', {
    name: 'workspace.shape_set_fill',
    description: 'Set the fill style for a specific shape.',
    parameters: [
      {
        name: 'shapeId',
        type: 'string',
        description: 'ID of the shape to style.',
        required: true,
      },
      {
        name: 'fillType',
        type: 'enum',
        description: 'Fill type (none, solid, pattern, image, gradient).',
        required: true,
        enum: ['none', 'solid', 'pattern', 'image', 'gradient'],
      },
      {
        name: 'color',
        type: 'string',
        description: 'Fill color (for solid fills).',
      },
      {
        name: 'patternId',
        type: 'string',
        description: 'Pattern identifier (for pattern fills).',
      },
      {
        name: 'opacity',
        type: 'number',
        description: 'Fill opacity (0-1).',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/shape_set_fill',
      shapeId: requireString(args.shapeId, 'shapeId'),
      fill: {
        type: requireEnum<'none' | 'solid' | 'pattern' | 'image' | 'gradient'>(
          args.fillType,
          'fillType',
          ['none', 'solid', 'pattern', 'image', 'gradient']
        ),
        ...(typeof args.color === 'string' && { color: args.color }),
        ...(typeof args.patternId === 'string' && { patternId: args.patternId }),
        ...(typeof args.opacity === 'number' && { opacity: args.opacity }),
      },
    }),
  }),
  defineWorkspaceTool('workspace/shape_set_stroke', {
    name: 'workspace.shape_set_stroke',
    description: 'Set the stroke style for a specific shape.',
    parameters: [
      {
        name: 'shapeId',
        type: 'string',
        description: 'ID of the shape to style.',
        required: true,
      },
      {
        name: 'color',
        type: 'string',
        description: 'Stroke color.',
        required: true,
      },
      {
        name: 'width',
        type: 'number',
        description: 'Stroke width.',
        required: true,
      },
      {
        name: 'opacity',
        type: 'number',
        description: 'Stroke opacity (0-1).',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/shape_set_stroke',
      shapeId: requireString(args.shapeId, 'shapeId'),
      stroke: {
        color: requireString(args.color, 'color'),
        width: requireNumber(args.width, 'width'),
        ...(typeof args.opacity === 'number' && { opacity: args.opacity }),
      },
    }),
  }),
  defineWorkspaceTool('workspace/shape_set_opacity', {
    name: 'workspace.shape_set_opacity',
    description: 'Set the overall opacity for a specific shape.',
    parameters: [
      {
        name: 'shapeId',
        type: 'string',
        description: 'ID of the shape to style.',
        required: true,
      },
      {
        name: 'opacity',
        type: 'number',
        description: 'Shape opacity (0-1).',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/shape_set_opacity',
      shapeId: requireString(args.shapeId, 'shapeId'),
      opacity: requireNumber(args.opacity, 'opacity'),
    }),
  }),
  defineWorkspaceTool('workspace/shape_set_blend_mode', {
    name: 'workspace.shape_set_blend_mode',
    description: 'Set the blend mode for a specific shape.',
    parameters: [
      {
        name: 'shapeId',
        type: 'string',
        description: 'ID of the shape to style.',
        required: true,
      },
      {
        name: 'blendMode',
        type: 'enum',
        description: 'Blend mode.',
        required: true,
        enum: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'],
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/shape_set_blend_mode',
      shapeId: requireString(args.shapeId, 'shapeId'),
      blendMode: requireEnum<'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten'>(
        args.blendMode,
        'blendMode',
        ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten']
      ),
    }),
  }),
  defineWorkspaceTool('workspace/shape_set_shadow', {
    name: 'workspace.shape_set_shadow',
    description: 'Set or remove shadow for a specific shape.',
    parameters: [
      {
        name: 'shapeId',
        type: 'string',
        description: 'ID of the shape to style.',
        required: true,
      },
      {
        name: 'offsetX',
        type: 'number',
        description: 'Shadow offset X (0 to remove shadow).',
      },
      {
        name: 'offsetY',
        type: 'number',
        description: 'Shadow offset Y.',
      },
      {
        name: 'blur',
        type: 'number',
        description: 'Shadow blur radius.',
      },
      {
        name: 'color',
        type: 'string',
        description: 'Shadow color.',
      },
    ],
    buildCommand: (args) => {
      const hasShadow = typeof args.offsetX === 'number' || typeof args.offsetY === 'number';
      return {
        type: 'workspace/shape_set_shadow',
        shapeId: requireString(args.shapeId, 'shapeId'),
        shadow: hasShadow
          ? {
            offsetX: typeof args.offsetX === 'number' ? args.offsetX : 0,
            offsetY: typeof args.offsetY === 'number' ? args.offsetY : 0,
            blur: typeof args.blur === 'number' ? args.blur : 0,
            color: typeof args.color === 'string' ? args.color : '#000000',
          }
          : null,
      };
    },
  }),
  defineWorkspaceTool('workspace/shape_apply_preset', {
    name: 'workspace.shape_apply_preset',
    description: 'Apply a predefined style preset to a specific shape.',
    parameters: [
      {
        name: 'shapeId',
        type: 'string',
        description: 'ID of the shape to style.',
        required: true,
      },
      {
        name: 'presetId',
        type: 'string',
        description: 'Preset identifier (e.g., "blueprint-style", "wood-floor").',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/shape_apply_preset',
      shapeId: requireString(args.shapeId, 'shapeId'),
      presetId: requireString(args.presetId, 'presetId'),
    }),
  }),
  defineWorkspaceTool('workspace/selection_set_fill', {
    name: 'workspace.selection_set_fill',
    description: 'Apply fill style to all selected shapes.',
    parameters: [
      {
        name: 'fillType',
        type: 'enum',
        description: 'Fill type.',
        required: true,
        enum: ['none', 'solid', 'pattern', 'image', 'gradient'],
      },
      {
        name: 'color',
        type: 'string',
        description: 'Fill color (for solid fills).',
      },
      {
        name: 'patternId',
        type: 'string',
        description: 'Pattern identifier (for pattern fills).',
      },
      {
        name: 'opacity',
        type: 'number',
        description: 'Fill opacity (0-1).',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selection_set_fill',
      fill: {
        type: requireEnum<'none' | 'solid' | 'pattern' | 'image' | 'gradient'>(
          args.fillType,
          'fillType',
          ['none', 'solid', 'pattern', 'image', 'gradient']
        ),
        ...(typeof args.color === 'string' && { color: args.color }),
        ...(typeof args.patternId === 'string' && { patternId: args.patternId }),
        ...(typeof args.opacity === 'number' && { opacity: args.opacity }),
      },
    }),
  }),
  defineWorkspaceTool('workspace/selection_set_stroke', {
    name: 'workspace.selection_set_stroke',
    description: 'Apply stroke style to all selected shapes.',
    parameters: [
      {
        name: 'color',
        type: 'string',
        description: 'Stroke color.',
        required: true,
      },
      {
        name: 'width',
        type: 'number',
        description: 'Stroke width.',
        required: true,
      },
      {
        name: 'opacity',
        type: 'number',
        description: 'Stroke opacity (0-1).',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selection_set_stroke',
      stroke: {
        color: requireString(args.color, 'color'),
        width: requireNumber(args.width, 'width'),
        ...(typeof args.opacity === 'number' && { opacity: args.opacity }),
      },
    }),
  }),
  defineWorkspaceTool('workspace/selection_set_opacity', {
    name: 'workspace.selection_set_opacity',
    description: 'Set opacity for all selected shapes.',
    parameters: [
      {
        name: 'opacity',
        type: 'number',
        description: 'Shape opacity (0-1).',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selection_set_opacity',
      opacity: requireNumber(args.opacity, 'opacity'),
    }),
  }),
  defineWorkspaceTool('workspace/selection_apply_preset', {
    name: 'workspace.selection_apply_preset',
    description: 'Apply a style preset to all selected shapes.',
    parameters: [
      {
        name: 'presetId',
        type: 'string',
        description: 'Preset identifier.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/selection_apply_preset',
      presetId: requireString(args.presetId, 'presetId'),
    }),
  }),

  // ============================================================================
  // Editing Tools: Group, Ungroup, Mirror, Fillet, Explode
  // ============================================================================

  defineWorkspaceTool('workspace/group_selection', {
    name: 'workspace.group_selection',
    description: 'Group the currently selected shapes into a single group.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/group_selection',
    }),
  }),

  defineWorkspaceTool('workspace/ungroup_selection', {
    name: 'workspace.ungroup_selection',
    description: 'Ungroup selected groups, freeing their member shapes.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/ungroup_selection',
    }),
  }),

  defineWorkspaceTool('workspace/mirror_selection', {
    name: 'workspace.mirror_selection',
    description: 'Mirror selected shapes across a line defined by two points.',
    parameters: [
      {
        name: 'x1',
        type: 'number',
        description: 'X coordinate of the first axis point.',
        required: true,
      },
      {
        name: 'y1',
        type: 'number',
        description: 'Y coordinate of the first axis point.',
        required: true,
      },
      {
        name: 'x2',
        type: 'number',
        description: 'X coordinate of the second axis point.',
        required: true,
      },
      {
        name: 'y2',
        type: 'number',
        description: 'Y coordinate of the second axis point.',
        required: true,
      },
      {
        name: 'keepOriginal',
        type: 'boolean',
        description: 'If true, keep original shapes; if false, move them.',
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/mirror_selection',
      axis: {
        point1: { x: requireNumber(args.x1, 'x1'), y: requireNumber(args.y1, 'y1') },
        point2: { x: requireNumber(args.x2, 'x2'), y: requireNumber(args.y2, 'y2') },
      },
      keepOriginal: args.keepOriginal !== false,
    }),
  }),

  defineWorkspaceTool('workspace/fillet', {
    name: 'workspace.fillet',
    description: 'Create a rounded fillet between two intersecting lines.',
    parameters: [
      {
        name: 'shapeId1',
        type: 'string',
        description: 'ID of the first line shape.',
        required: true,
      },
      {
        name: 'shapeId2',
        type: 'string',
        description: 'ID of the second line shape.',
        required: true,
      },
      {
        name: 'radius',
        type: 'number',
        description: 'Fillet radius in meters.',
        required: true,
      },
    ],
    buildCommand: (args) => ({
      type: 'workspace/fillet',
      shapeId1: requireString(args.shapeId1, 'shapeId1'),
      shapeId2: requireString(args.shapeId2, 'shapeId2'),
      radius: requireNumber(args.radius, 'radius'),
    }),
  }),

  defineWorkspaceTool('workspace/explode_selection', {
    name: 'workspace.explode_selection',
    description: 'Explode compound shapes into their primitive components.',
    parameters: [],
    buildCommand: () => ({
      type: 'workspace/explode_selection',
    }),
  }),
];

export const findWorkspaceTool = (name: string): WorkspaceToolDefinition | undefined =>
  workspaceTools.find((tool) => tool.name === name);

export const executeWorkspaceTool = (
  bus: WorkspaceCommandBus,
  name: string,
  args: Record<string, unknown> = {}
) => {
  const definition = findWorkspaceTool(name);
  if (!definition) {
    throw new Error(`Unknown workspace tool: ${name}`);
  }
  const command = definition.buildCommand(args);
  return bus.execute(command);
};

