import type {
    Shape,
    Point,
    WallShape,
    RoomShape,
    OpeningShape,
    GuidelineShape,
    GuidelineOrientation,
    WallCreationOptions,
    RoomCreationOptions,
    OpeningPlacementOptions,
    AssetPlacementOptions,
    OpeningCategory,
    OpeningSwingState,
    OpeningHostAttachment,
    OpeningPose,
    WallCenterlineDescriptor,
    MutableSnapshot,
    WorkspaceSnapshot
} from '../types';
import type {
    LineShape,
    ArcShape,
} from '../../../../components/Workspace/types';
import {
    generateShapeId,
    getPolygonCentroid,
    calculatePolygonArea,
    calculatePolygonPerimeter,
    normalizeVector,
    perpendicular,
    dot,
    clampNormalized,
    getWallAlignmentCenterOffset,
} from '../utils';
import type {
    DimensionShape,
    TextShape,
    ZoneShape,
    AssetShape,
} from '../../../../components/Workspace/types';
import { findClosedWallLoops } from '../../../../components/Workspace/utils/walls';

import {
    DEFAULT_WALL_THICKNESS,
    DEFAULT_WALL_HEIGHT,
    DEFAULT_OPENING_WIDTH,
    DEFAULT_OPENING_HEIGHT,
    DEFAULT_OPENING_SILL,
    DEFAULT_FRAME_THICKNESS,
    DEFAULT_OPENING_SWING,
    MIN_OPENING_WIDTH,
    WALL_SNAP_PROXIMITY_THRESHOLD,
    GUIDELINE_COLOR
} from '../constants';

export class GeometryManager {
    public buildWallShape(start: Point, end: Point, options: WallCreationOptions = {}): WallShape {
        return {
            type: 'wall',
            id: generateShapeId('wall'),
            centerline: [start, end],
            controlPoint: null,
            thickness: options.thickness ?? DEFAULT_WALL_THICKNESS,
            height: options.height ?? DEFAULT_WALL_HEIGHT,
            alignment: options.alignment ?? 'outside',
            materialId: options.materialId,
        };
    }

    public buildRoomShape(points: Point[], options: RoomCreationOptions = {}): RoomShape {
        const sanitizedPoints = points.map((point) => ({ x: point.x, y: point.y }));
        const area = calculatePolygonArea(sanitizedPoints);
        const perimeter = calculatePolygonPerimeter(sanitizedPoints);
        const centroid = getPolygonCentroid(sanitizedPoints);
        return {
            type: 'room',
            id: generateShapeId('room'),
            points: sanitizedPoints,
            area,
            perimeter,
            centroid,
            label: options.label,
            wallIds: options.wallIds,
        };
    }

    public buildAssetShape(point: Point, options: AssetPlacementOptions): AssetShape {
        return {
            type: 'asset',
            id: generateShapeId('asset'),
            category: options.category ?? 'furniture',
            assetId: options.assetId,
            position: { x: point.x, y: point.y },
            width: options.width ?? 1.0,
            height: options.height ?? 1.0,
            rotation: options.rotation ?? 0,
            flipHorizontal: options.flipHorizontal ?? false,
            flipVertical: options.flipVertical ?? false,
            stroke: options.stroke ?? '#000000',
            strokeWidth: options.strokeWidth ?? 1,
            opacity: options.opacity ?? 1,
            label: options.label,
            metadata: options.metadata,
        };
    }

    public buildOpeningShape(point: Point, draft: MutableSnapshot | WorkspaceSnapshot, options: OpeningPlacementOptions = {}): OpeningShape {
        const category: OpeningCategory = options.category ?? 'door';
        const width = Math.max(MIN_OPENING_WIDTH, options.width ?? DEFAULT_OPENING_WIDTH);
        const height = Math.max(0.1, options.height ?? DEFAULT_OPENING_HEIGHT);
        const sillHeight = options.sillHeight ?? DEFAULT_OPENING_SILL;
        const headHeight = Math.max(sillHeight + height, options.headHeight ?? sillHeight + height);
        const frameThickness = Math.max(0.01, options.frameThickness ?? DEFAULT_FRAME_THICKNESS);
        const swing = this.mergeOpeningSwing(options.swing, options.facing);
        const autoAttach = options.autoAttach !== false;

        const explicitWallId = options.host?.wallId ?? options.wallId ?? null;
        const targetWall = explicitWallId ? this.findWallById(draft.shapes, explicitWallId) : null;
        let pose: OpeningPose | null = null;

        if (options.host && targetWall) {
            const normalizedHost = this.normalizeHostAttachment(targetWall, options.host);
            if (normalizedHost) {
                pose = this.buildPoseFromAttachment(targetWall, normalizedHost);
            }
        }

        if (!pose) {
            if (autoAttach) {
                const closestWallResult = targetWall
                    ? { wall: targetWall, distance: 0 }
                    : this.findClosestWall(draft.shapes, point, WALL_SNAP_PROXIMITY_THRESHOLD);
                if (closestWallResult) {
                    pose = this.projectPointOntoWall(
                        closestWallResult.wall,
                        point,
                        typeof options.normalOffset === 'number' ? options.normalOffset : undefined,
                        options.facing
                    );
                }
            }
        }

        const anchor = pose?.anchor ?? point;
        const direction = pose?.direction ?? { x: 1, y: 0 };
        const normal = pose?.normal ?? { x: 0, y: 1 };
        const host = pose
            ? {
                wallId: pose.wallId,
                normalizedPosition: pose.normalizedPosition,
                distance: pose.distance,
                normalOffset: pose.normalOffset,
            }
            : null;

        return {
            type: 'opening',
            id: generateShapeId('opening'),
            category,
            width,
            height,
            sillHeight,
            headHeight,
            frameThickness,
            anchor,
            direction,
            normal,
            swing: {
                ...swing,
                facing: pose?.facing ?? swing.facing,
            },
            host,
            metadata: options.metadata ? { ...options.metadata } : undefined,
        };
    }

    public mergeOpeningSwing(
        overrides?: Partial<OpeningSwingState>,
        facingOverride?: 'positive' | 'negative'
    ): OpeningSwingState {
        return {
            operation: overrides?.operation ?? DEFAULT_OPENING_SWING.operation,
            direction: overrides?.direction ?? DEFAULT_OPENING_SWING.direction,
            hinge: overrides?.hinge ?? DEFAULT_OPENING_SWING.hinge,
            angle: overrides?.angle ?? DEFAULT_OPENING_SWING.angle,
            flipped: overrides?.flipped ?? DEFAULT_OPENING_SWING.flipped,
            facing: facingOverride ?? overrides?.facing ?? DEFAULT_OPENING_SWING.facing,
        };
    }

    public normalizeHostAttachment(
        wall: WallShape,
        host: Partial<Omit<OpeningHostAttachment, 'wallId'>> & { wallId: string }
    ): OpeningHostAttachment | null {
        const descriptor = this.describeWallCenterline(wall);
        if (!descriptor) {
            return null;
        }
        const totalLength = descriptor.totalLength;
        let normalizedPosition: number | null = null;
        if (typeof host.normalizedPosition === 'number' && Number.isFinite(host.normalizedPosition)) {
            normalizedPosition = clampNormalized(host.normalizedPosition);
        } else if (typeof host.distance === 'number' && Number.isFinite(host.distance)) {
            normalizedPosition = clampNormalized(host.distance / totalLength);
        }
        if (normalizedPosition === null) {
            normalizedPosition = 0.5;
        }
        const distance = normalizedPosition * totalLength;
        const normalOffset = typeof host.normalOffset === 'number' ? host.normalOffset : 0;
        return {
            wallId: wall.id,
            normalizedPosition,
            distance,
            normalOffset,
        };
    }

    public buildPoseFromAttachment(wall: WallShape, attachment: OpeningHostAttachment): OpeningPose | null {
        const descriptor = this.describeWallCenterline(wall);
        if (!descriptor) {
            return null;
        }
        const alignmentOffset = getWallAlignmentCenterOffset(wall);
        const userOffset = typeof attachment.normalOffset === 'number' ? attachment.normalOffset : 0;
        const totalOffset = alignmentOffset + userOffset;
        const targetDistance = clampNormalized(attachment.normalizedPosition) * descriptor.totalLength;
        let traversed = 0;
        for (const segment of descriptor.segments) {
            if (segment.length <= 0) {
                continue;
            }
            if (traversed + segment.length >= targetDistance - 1e-9) {
                const remaining = targetDistance - traversed;
                const t = segment.length > 0 ? remaining / segment.length : 0;
                const anchorOnCenter = {
                    x: segment.start.x + (segment.end.x - segment.start.x) * t,
                    y: segment.start.y + (segment.end.y - segment.start.y) * t,
                };
                const direction = normalizeVector(segment.end.x - segment.start.x, segment.end.y - segment.start.y);
                const normal = perpendicular(direction);
                const anchor = {
                    x: anchorOnCenter.x + normal.x * totalOffset,
                    y: anchorOnCenter.y + normal.y * totalOffset,
                };
                return {
                    wallId: wall.id,
                    normalizedPosition: clampNormalized(attachment.normalizedPosition),
                    distance: targetDistance,
                    normalOffset: userOffset,
                    anchor,
                    direction,
                    normal,
                    facing: totalOffset < 0 ? 'negative' : 'positive',
                };
            }
            traversed += segment.length;
        }
        const lastSegment = descriptor.segments[descriptor.segments.length - 1];
        if (!lastSegment || lastSegment.length <= 0) {
            return null;
        }
        const direction = normalizeVector(lastSegment.end.x - lastSegment.start.x, lastSegment.end.y - lastSegment.start.y);
        const normal = perpendicular(direction);
        const anchor = {
            x: lastSegment.end.x + normal.x * totalOffset,
            y: lastSegment.end.y + normal.y * totalOffset,
        };
        return {
            wallId: wall.id,
            normalizedPosition: clampNormalized(attachment.normalizedPosition),
            distance: descriptor.totalLength,
            normalOffset: userOffset,
            anchor,
            direction,
            normal,
            facing: totalOffset < 0 ? 'negative' : 'positive',
        };
    }

    public projectPointOntoWall(
        wall: WallShape,
        point: Point,
        normalOffsetOverride?: number,
        facingOverride?: 'positive' | 'negative'
    ): OpeningPose | null {
        const descriptor = this.describeWallCenterline(wall);
        if (!descriptor) {
            return null;
        }
        let best: {
            distanceToPoint: number;
            anchor: Point;
            normalizedPosition: number;
            alongDistance: number;
            direction: Point;
        } | null = null;
        let accumulated = 0;
        for (const segment of descriptor.segments) {
            if (segment.length <= 0) {
                continue;
            }
            const dx = segment.end.x - segment.start.x;
            const dy = segment.end.y - segment.start.y;
            const lenSq = dx * dx + dy * dy;
            if (lenSq < 1e-9) {
                accumulated += segment.length;
                continue;
            }
            let t = ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            const projection = {
                x: segment.start.x + dx * t,
                y: segment.start.y + dy * t,
            };
            const dist = Math.hypot(point.x - projection.x, point.y - projection.y);
            if (!best || dist < best.distanceToPoint) {
                const direction = normalizeVector(dx, dy);
                best = {
                    distanceToPoint: dist,
                    anchor: projection,
                    normalizedPosition: clampNormalized((accumulated + segment.length * t) / descriptor.totalLength),
                    alongDistance: accumulated + segment.length * t,
                    direction,
                };
            }
            accumulated += segment.length;
        }
        if (!best) {
            return null;
        }
        const normal = perpendicular(best.direction);
        const offsetVector = {
            x: point.x - best.anchor.x,
            y: point.y - best.anchor.y,
        };
        const facing =
            facingOverride ??
            (dot(offsetVector, normal) < 0
                ? 'negative'
                : 'positive');
        const alignmentOffset = getWallAlignmentCenterOffset(wall);
        const userOffset = typeof normalOffsetOverride === 'number' ? normalOffsetOverride : 0;
        const totalOffset = alignmentOffset + userOffset;
        const anchor = {
            x: best.anchor.x + normal.x * totalOffset,
            y: best.anchor.y + normal.y * totalOffset,
        };
        return {
            wallId: wall.id,
            normalizedPosition: best.normalizedPosition,
            distance: best.alongDistance,
            normalOffset: userOffset,
            anchor,
            direction: best.direction,
            normal,
            facing,
        };
    }

    public describeWallCenterline(wall: WallShape): WallCenterlineDescriptor | null {
        if (!wall.centerline || wall.centerline.length < 2) {
            return null;
        }
        const segments: WallCenterlineDescriptor['segments'] = [];
        let totalLength = 0;
        for (let i = 0; i < wall.centerline.length - 1; i += 1) {
            const start = wall.centerline[i];
            const end = wall.centerline[i + 1];
            const length = Math.hypot(end.x - start.x, end.y - start.y);
            segments.push({ start, end, length });
            totalLength += length;
        }
        if (totalLength < 1e-9) {
            return null;
        }
        return { segments, totalLength };
    }

    public findWallById(shapes: Shape[], wallId: string): WallShape | null {
        return (
            shapes.find((shape): shape is WallShape => shape.type === 'wall' && shape.id === wallId) ?? null
        );
    }

    public findClosestWall(shapes: Shape[], point: Point, maxDistance?: number): { wall: WallShape; distance: number } | null {
        let bestWall: WallShape | null = null;
        let bestDistance = Infinity;
        shapes.forEach((shape) => {
            if (shape.type !== 'wall' || shape.centerline.length < 2) {
                return;
            }
            const descriptor = this.describeWallCenterline(shape);
            if (!descriptor) {
                return;
            }
            // Use the more accurate projection method that handles curved walls
            for (const segment of descriptor.segments) {
                if (segment.length <= 0) {
                    continue;
                }
                const dx = segment.end.x - segment.start.x;
                const dy = segment.end.y - segment.start.y;
                const lenSq = dx * dx + dy * dy;
                if (lenSq < 1e-9) {
                    continue;
                }
                let t = ((point.x - segment.start.x) * dx + (point.y - segment.start.y) * dy) / lenSq;
                t = Math.max(0, Math.min(1, t));
                const projection = {
                    x: segment.start.x + dx * t,
                    y: segment.start.y + dy * t,
                };
                const distance = Math.hypot(point.x - projection.x, point.y - projection.y);
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestWall = shape;
                }
            }
        });
        if (!bestWall) {
            return null;
        }
        // If maxDistance is specified, only return wall if within threshold
        if (typeof maxDistance === 'number' && bestDistance > maxDistance) {
            return null;
        }
        return { wall: bestWall, distance: bestDistance };
    }

    public updateOpeningPreview(
        shape: OpeningShape,
        point: Point,
        source: WorkspaceSnapshot | MutableSnapshot
    ): OpeningShape {
        const shapes = source.shapes;
        const preferredWallId = shape.host?.wallId ?? null;
        const preferredWall = preferredWallId ? this.findWallById(shapes, preferredWallId) : null;

        // If opening is already attached, check if we should keep it attached or detach
        let attachmentPose: OpeningPose | null = null;
        if (preferredWall) {
            // Check perpendicular distance from point to wall centerline
            const wallThickness = preferredWall.thickness ?? DEFAULT_WALL_THICKNESS;
            const halfThickness = wallThickness / 2;

            // Smooth detachment: use a threshold slightly larger than the snap radius to create hysteresis
            // This prevents the "flicker" where it detaches and immediately re-snaps
            const detachThreshold = Math.max(halfThickness + 0.1, WALL_SNAP_PROXIMITY_THRESHOLD + 0.05);

            const closestWallResult = this.findClosestWall([preferredWall], point);
            if (closestWallResult && closestWallResult.distance <= detachThreshold) {
                // Still within threshold - project and keep attached
                const pose = this.projectPointOntoWall(preferredWall, point, shape.host?.normalOffset, shape.swing.facing);
                if (pose) {
                    attachmentPose = pose;
                }
            }
            // If outside threshold, attachmentPose remains null and we'll detach
        }

        // If not attached to preferred wall, look for nearby walls to snap to
        if (!attachmentPose) {
            const closestWallResult = this.findClosestWall(shapes, point, WALL_SNAP_PROXIMITY_THRESHOLD);
            if (closestWallResult) {
                attachmentPose = this.projectPointOntoWall(
                    closestWallResult.wall,
                    point,
                    shape.host?.normalOffset,
                    shape.swing.facing
                );
            }
        }

        if (!attachmentPose) {
            // No wall within proximity - detach and place freely
            return {
                ...shape,
                anchor: point,
                host: null,
                direction: shape.direction, // Keep current direction
                normal: shape.normal, // Keep current normal
            };
        }

        return {
            ...shape,
            anchor: attachmentPose.anchor,
            direction: attachmentPose.direction,
            normal: attachmentPose.normal,
            swing: { ...shape.swing, facing: attachmentPose.facing },
            host: {
                wallId: attachmentPose.wallId,
                normalizedPosition: attachmentPose.normalizedPosition,
                distance: attachmentPose.distance,
                normalOffset: attachmentPose.normalOffset,
            },
        };
    }

    public recomputeOpeningsForWalls(draft: MutableSnapshot, wallIds: Iterable<string>) {
        const wallSet = new Set(wallIds);
        if (!wallSet.size) {
            return;
        }
        const wallLookup = new Map<string, WallShape>();
        draft.shapes.forEach((shape) => {
            if (shape.type === 'wall' && wallSet.has(shape.id)) {
                wallLookup.set(shape.id, shape);
            }
        });
        if (!wallLookup.size) {
            return;
        }
        draft.shapes = draft.shapes.map((shape) => {
            if (shape.type !== 'opening' || !shape.host) {
                return shape;
            }
            if (!wallSet.has(shape.host.wallId)) {
                return shape;
            }
            const wall = wallLookup.get(shape.host.wallId);
            if (!wall) {
                return {
                    ...shape,
                    host: null,
                };
            }
            const pose = this.buildPoseFromAttachment(wall, shape.host);
            if (!pose) {
                return {
                    ...shape,
                    host: null,
                };
            }
            return {
                ...shape,
                anchor: pose.anchor,
                direction: pose.direction,
                normal: pose.normal,
                swing: { ...shape.swing, facing: pose.facing ?? shape.swing.facing },
                host: {
                    wallId: pose.wallId,
                    normalizedPosition: pose.normalizedPosition,
                    distance: pose.distance,
                    normalOffset: pose.normalOffset,
                },
            };
        });
    }

    public removeOpeningsAttachedToWalls(draft: MutableSnapshot, wallIds: Set<string>) {
        if (!wallIds.size) {
            return;
        }
        draft.shapes = draft.shapes.filter((shape) => {
            if (shape.type !== 'opening' || !shape.host) {
                return true;
            }
            return !wallIds.has(shape.host.wallId);
        });
    }

    public detectAndUpdateRooms(draft: MutableSnapshot) {
        // Automatic room detection disabled - rooms are no longer auto-created from closed walls
        // Remove any existing auto-created rooms
        draft.shapes = draft.shapes.filter((shape) => shape.type !== 'room');
    }

    /**
     * Update wall-bound zones when their bounding walls are moved.
     * Recalculates zone polygons based on the new wall positions.
     */
    public updateWallBoundZones(draft: MutableSnapshot) {
        const loops = findClosedWallLoops(draft.shapes);
        
        // Create a lookup map: sorted wallIds key -> loop polygon
        const loopLookup = new Map<string, { wallIds: string[]; polygon: Point[] }>();
        loops.forEach((loop) => {
            const key = loop.wallIds.slice().sort().join('|');
            loopLookup.set(key, loop);
        });
        
        // Update each wall-bound zone
        draft.shapes = draft.shapes.map((shape) => {
            if (shape.type !== 'zone' || !shape.wallIds || shape.wallIds.length === 0) {
                return shape;
            }
            
            const key = shape.wallIds.slice().sort().join('|');
            const loop = loopLookup.get(key);
            
            if (loop) {
                // Update zone polygon to match new wall positions
                const newPoints = loop.polygon.slice(0, -1); // Remove closing duplicate
                return {
                    ...shape,
                    points: newPoints,
                    area: calculatePolygonArea(newPoints),
                } as ZoneShape;
            }
            
            // If the loop no longer exists (walls were deleted), keep the zone as-is
            // or optionally remove it - for now we keep it
            return shape;
        });
    }

    public updateShapePreview(shape: Shape, point: Point, snapshot: WorkspaceSnapshot | MutableSnapshot): Shape {
        if (shape.type === 'line') {
            return { ...shape, end: point };
        }
        if (shape.type === 'polyline') {
            const points = shape.points.slice();
            points[points.length - 1] = point;
            return { ...shape, points };
        }
        if (shape.type === 'zone') {
            const points = shape.points.slice();
            points[points.length - 1] = point;
            // Update area for preview
            const area = calculatePolygonArea(points.slice(0, -1)); // Calculate area without trailing point
            return { ...shape, points, area };
        }
        if (shape.type === 'curve') {
            const points = shape.points.slice();
            points[points.length - 1] = point;
            return { ...shape, points };
        }
        if (shape.type === 'arc') {
            const controlPointMoved = Math.abs(shape.controlPoint.x - shape.start.x) > 0.001 ||
                Math.abs(shape.controlPoint.y - shape.start.y) > 0.001;
            if (!controlPointMoved) {
                return { ...shape, end: point };
            }
            return { ...shape, controlPoint: point };
        }
        if (shape.type === 'circle') {
            const radius = Math.hypot(point.x - shape.center.x, point.y - shape.center.y);
            return { ...shape, cursorPoint: point, radius };
        }
        if (shape.type === 'rectangle') {
            return { ...shape, end: point };
        }
        if (shape.type === 'guideline' && shape.orientation === 'freeform') {
            return { ...shape, end: point };
        }
        if (shape.type === 'guideline' && shape.orientation === 'horizontal') {
            return { ...shape, position: point.y };
        }
        if (shape.type === 'guideline' && shape.orientation === 'vertical') {
            return { ...shape, position: point.x };
        }
        if (shape.type === 'wall') {
            const centerline = shape.centerline.slice();
            centerline[centerline.length - 1] = point;
            return { ...shape, centerline };
        }
        if (shape.type === 'opening') {
            return this.updateOpeningPreview(shape, point, snapshot);
        }
        if (shape.type === 'dimension') {
            return this.updateDimensionPreview(shape, point);
        }
        return shape;
    }

    public buildGuidelinePreview(point: Point, orientation: GuidelineOrientation): GuidelineShape {
        if (orientation === 'horizontal') {
            return {
                type: 'guideline',
                id: 'preview',
                orientation: 'horizontal',
                position: point.y,
                stroke: GUIDELINE_COLOR,
                strokeWidth: 1,
            };
        }
        if (orientation === 'vertical') {
            return {
                type: 'guideline',
                id: 'preview',
                orientation: 'vertical',
                position: point.x,
                stroke: GUIDELINE_COLOR,
                strokeWidth: 1,
            };
        }
        const length = 2;
        const angle = -Math.PI / 4;
        const dx = length * Math.cos(angle);
        const dy = length * Math.sin(angle);
        return {
            type: 'guideline',
            id: 'preview',
            orientation: 'freeform',
            start: { x: point.x - dx, y: point.y - dy },
            end: { x: point.x + dx, y: point.y + dy },
            stroke: GUIDELINE_COLOR,
            strokeWidth: 1,
        };
    }
    public buildDimensionShape(start: Point, end: Point): DimensionShape {
        return {
            type: 'dimension',
            id: generateShapeId('dimension'),
            start,
            end,
            offset: 0,
            stroke: '#000000',
            strokeWidth: 1,
            editingStage: 'end',
        };
    }

    public buildTextShape(position: Point): TextShape {
        return {
            type: 'text',
            id: generateShapeId('text'),
            position,
            content: 'Your Text',
            fontSize: 0.3,
            fontFamily: 'Arial',
            color: '#000000',
            bold: false,
            italic: false,
            underline: false,
            textAlign: 'left',
        };
    }

    public updateDimensionPreview(shape: DimensionShape, cursor: Point): DimensionShape {
        if (shape.editingStage === 'end') {
            return { ...shape, end: cursor };
        } else if (shape.editingStage === 'offset') {
            // Calculate offset distance
            // Project cursor onto the perpendicular of the line connecting start and end
            const dx = shape.end.x - shape.start.x;
            const dy = shape.end.y - shape.start.y;
            const len = Math.hypot(dx, dy);

            if (len === 0) return shape;

            // Unit vector of the dimension line
            const ux = dx / len;
            const uy = dy / len;

            // Vector from start to cursor
            const vx = cursor.x - shape.start.x;
            const vy = cursor.y - shape.start.y;

            // Cross product (2D) to find perpendicular distance
            // This gives signed distance: positive is one side, negative is other
            const offset = vx * -uy + vy * ux;

            return { ...shape, offset };
        }
        return shape;
    }

    public findShapeNearPoint(shapes: Shape[], point: Point, threshold: number = 0.2): string | undefined {
        for (const shape of shapes) {
            if (shape.type === 'wall') {
                const wall = shape as WallShape;
                if (wall.centerline.length < 2) continue;
                // Check distance to centerline segments
                for (let i = 0; i < wall.centerline.length - 1; i++) {
                    const p1 = wall.centerline[i];
                    const p2 = wall.centerline[i + 1];
                    // Simple distance from point to segment
                    const dist = this.distanceToSegment(point, p1, p2);
                    if (dist < threshold) return shape.id;
                }
            } else if (shape.type === 'line' || shape.type === 'polyline' || shape.type === 'curve' || shape.type === 'zone') {
                // Similar check for lines/polylines/curves/zones
                let points: Point[] = [];
                if (shape.type === 'line') {
                    points = [shape.start, shape.end];
                } else {
                    points = shape.points;
                    // For closed shapes like zones, we might want to check the closing segment too
                    if (shape.type === 'zone' && points.length > 2) {
                        // Check closing segment
                        const dist = this.distanceToSegment(point, points[points.length - 1], points[0]);
                        if (dist < threshold) return shape.id;
                    }
                }

                for (let i = 0; i < points.length - 1; i++) {
                    const dist = this.distanceToSegment(point, points[i], points[i + 1]);
                    if (dist < threshold) return shape.id;
                }
            } else if (shape.type === 'rectangle') {
                const points = [
                    shape.start,
                    { x: shape.end.x, y: shape.start.y },
                    shape.end,
                    { x: shape.start.x, y: shape.end.y },
                    shape.start // Close the loop
                ];
                for (let i = 0; i < points.length - 1; i++) {
                    const dist = this.distanceToSegment(point, points[i], points[i + 1]);
                    if (dist < threshold) return shape.id;
                }
            } else if (shape.type === 'circle') {
                const dist = Math.hypot(point.x - shape.center.x, point.y - shape.center.y);
                // Check if point is near the circumference
                if (Math.abs(dist - shape.radius) < threshold) return shape.id;
            } else if (shape.type === 'arc') {
                // Approximate arc as segments or check distance to arc
                const dist1 = this.distanceToSegment(point, shape.start, shape.controlPoint);
                if (dist1 < threshold) return shape.id;
                const dist2 = this.distanceToSegment(point, shape.controlPoint, shape.end);
                if (dist2 < threshold) return shape.id;
            }
        }
        return undefined;
    }

    private distanceToSegment(p: Point, v: Point, w: Point): number {
        const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return Math.hypot(p.x - projection.x, p.y - projection.y);
    }

    // ============================================================================
    // Fillet Operation
    // ============================================================================

    /**
     * Creates a fillet (rounded corner) between two intersecting lines.
     * Trims both lines at the tangent points and adds an arc.
     * 
     * @param draft The mutable snapshot
     * @param shapeId1 ID of the first line
     * @param shapeId2 ID of the second line  
     * @param radius The fillet radius
     * @returns The ID of the created arc, or null if fillet cannot be created
     */
    public createFillet(
        draft: MutableSnapshot,
        shapeId1: string,
        shapeId2: string,
        radius: number
    ): string | null {
        if (radius <= 0) return null;

        // Find the shapes
        const shape1 = draft.shapes.find(s => s.id === shapeId1);
        const shape2 = draft.shapes.find(s => s.id === shapeId2);

        if (!shape1 || !shape2) return null;

        // Currently only support line-to-line fillets
        if (shape1.type !== 'line' || shape2.type !== 'line') {
            console.warn('Fillet currently only supports line-to-line intersections');
            return null;
        }

        const line1 = shape1 as LineShape;
        const line2 = shape2 as LineShape;

        // Find the intersection point
        const intersection = this.lineLineIntersection(
            line1.start, line1.end,
            line2.start, line2.end
        );

        if (!intersection) {
            console.warn('Lines do not intersect');
            return null;
        }

        // Calculate direction vectors
        const dir1 = this.normalize({
            x: line1.end.x - line1.start.x,
            y: line1.end.y - line1.start.y,
        });
        const dir2 = this.normalize({
            x: line2.end.x - line2.start.x,
            y: line2.end.y - line2.start.y,
        });

        // Calculate the angle between the lines
        const dotProduct = dir1.x * dir2.x + dir1.y * dir2.y;
        const angle = Math.acos(Math.max(-1, Math.min(1, Math.abs(dotProduct))));

        // If lines are nearly parallel, cannot create fillet
        if (angle < 0.01) {
            console.warn('Lines are nearly parallel, cannot create fillet');
            return null;
        }

        // Calculate fillet arc center
        // The center lies on the angle bisector at a specific distance
        const halfAngle = (Math.PI - angle) / 2;
        
        // Determine which directions point away from intersection on each line
        const awayDir1 = this.getDirectionAwayFromPoint(line1, intersection);
        const awayDir2 = this.getDirectionAwayFromPoint(line2, intersection);

        // Bisector direction (normalized sum of the away directions)
        const bisector = this.normalize({
            x: awayDir1.x + awayDir2.x,
            y: awayDir1.y + awayDir2.y,
        });

        // Distance from intersection to arc center
        const centerDist = radius / Math.sin(halfAngle);

        // Arc center position
        const arcCenter = {
            x: intersection.x + bisector.x * centerDist,
            y: intersection.y + bisector.y * centerDist,
        };

        // Calculate tangent points (where the arc touches each line)
        const tangent1 = this.closestPointOnLine(arcCenter, line1.start, line1.end);
        const tangent2 = this.closestPointOnLine(arcCenter, line2.start, line2.end);

        if (!tangent1 || !tangent2) {
            return null;
        }

        // Determine which endpoint of each line is closer to the intersection
        // and trim that endpoint to the tangent point
        const dist1Start = Math.hypot(line1.start.x - intersection.x, line1.start.y - intersection.y);
        const dist1End = Math.hypot(line1.end.x - intersection.x, line1.end.y - intersection.y);
        const dist2Start = Math.hypot(line2.start.x - intersection.x, line2.start.y - intersection.y);
        const dist2End = Math.hypot(line2.end.x - intersection.x, line2.end.y - intersection.y);

        // Update line1
        const trimmedLine1: LineShape = dist1Start < dist1End
            ? { ...line1, start: tangent1 }
            : { ...line1, end: tangent1 };

        // Update line2
        const trimmedLine2: LineShape = dist2Start < dist2End
            ? { ...line2, start: tangent2 }
            : { ...line2, end: tangent2 };

        // Create the fillet arc
        // The control point is at the intersection to define the arc curvature
        const arcId = generateShapeId('arc');
        const filletArc: ArcShape = {
            type: 'arc',
            id: arcId,
            start: tangent1,
            end: tangent2,
            controlPoint: intersection,
            stroke: line1.stroke,
            strokeWidth: line1.strokeWidth,
            appearance: line1.appearance,
        };

        // Update the shapes array
        draft.shapes = draft.shapes.map(s => {
            if (s.id === shapeId1) return trimmedLine1;
            if (s.id === shapeId2) return trimmedLine2;
            return s;
        });

        // Add the arc
        draft.shapes = [...draft.shapes, filletArc];

        return arcId;
    }

    /**
     * Find the intersection point of two line segments (extended as infinite lines).
     */
    private lineLineIntersection(
        p1: Point, p2: Point,
        p3: Point, p4: Point
    ): Point | null {
        const d1x = p2.x - p1.x;
        const d1y = p2.y - p1.y;
        const d2x = p4.x - p3.x;
        const d2y = p4.y - p3.y;

        const cross = d1x * d2y - d1y * d2x;

        // Lines are parallel
        if (Math.abs(cross) < 1e-10) {
            return null;
        }

        const dx = p3.x - p1.x;
        const dy = p3.y - p1.y;

        const t = (dx * d2y - dy * d2x) / cross;

        return {
            x: p1.x + t * d1x,
            y: p1.y + t * d1y,
        };
    }

    /**
     * Normalize a vector to unit length.
     */
    private normalize(v: Point): Point {
        const len = Math.hypot(v.x, v.y);
        if (len < 1e-10) return { x: 0, y: 0 };
        return { x: v.x / len, y: v.y / len };
    }

    /**
     * Get the direction vector pointing away from a point along a line.
     */
    private getDirectionAwayFromPoint(line: LineShape, point: Point): Point {
        const toStart = {
            x: line.start.x - point.x,
            y: line.start.y - point.y,
        };
        const toEnd = {
            x: line.end.x - point.x,
            y: line.end.y - point.y,
        };

        const distToStart = Math.hypot(toStart.x, toStart.y);
        const distToEnd = Math.hypot(toEnd.x, toEnd.y);

        // Return the direction toward the farther endpoint
        if (distToStart > distToEnd) {
            return this.normalize(toStart);
        } else {
            return this.normalize(toEnd);
        }
    }

    /**
     * Find the closest point on a line segment to a given point.
     */
    private closestPointOnLine(point: Point, lineStart: Point, lineEnd: Point): Point {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const lenSq = dx * dx + dy * dy;

        if (lenSq < 1e-10) {
            return lineStart;
        }

        // Project point onto line (unclamped for infinite line)
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;

        return {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy,
        };
    }
}
