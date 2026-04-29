/**
 * Workspace Command Coverage Tests
 * 
 * This test suite validates that all 48 WorkspaceCommand types execute correctly
 * without errors. It serves as both a regression test and documentation of command
 * behavior for the RL training infrastructure.
 * 
 * Run with: npm test (or directly: tsx tests/workspaceCommands.test.ts)
 */

import { WorkspaceState, WorkspaceCommandBus } from '../apps/maya-web/src/domain/workspace/core/WorkspaceState';
import type { WorkspaceCommand, WorkspaceSnapshot } from '../apps/maya-web/src/domain/workspace/core/WorkspaceState';
import type { Point, WallShape } from '../apps/maya-web/src/components/Workspace/types';

// Test utilities
function createTestPoint(x = 0, y = 0): Point {
    return { x, y };
}

function expectClose(value: number, expected: number, label: string, epsilon = 1e-6) {
    if (Math.abs(value - expected) > epsilon) {
        throw new Error(`${label} expected ${expected} but got ${value}`);
    }
}

function assertNoError(fn: () => void, commandName: string) {
    try {
        fn();
        console.log(`✅ ${commandName}`);
    } catch (error) {
        console.error(`❌ ${commandName} failed:`, error);
        throw error;
    }
}

function assertStateChanged(
    before: WorkspaceSnapshot,
    after: WorkspaceSnapshot,
    property: keyof WorkspaceSnapshot,
    commandName: string
) {
    if (JSON.stringify(before[property]) === JSON.stringify(after[property])) {
        console.warn(`⚠️  ${commandName}: ${String(property)} did not change`);
    }
}

// Main test suite
export function runWorkspaceCommandTests() {
    console.log('\n🧪 Starting Workspace Command Coverage Tests\n');
    console.log('Testing all 48 WorkspaceCommand types...\n');

    let passedTests = 0;
    let failedTests = 0;

    // ========== Tool Selection Commands ==========
    console.log('📝 Tool Selection & Settings');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 1: workspace/select_tool
        assertNoError(() => {
            const before = state.getSnapshot();
            bus.execute({ type: 'workspace/select_tool', tool: 'wall' });
            const after = state.getSnapshot();
            if (after.activeTool !== 'wall') throw new Error('Tool not changed');
        }, 'workspace/select_tool');
        passedTests++;

        // Test 2: workspace/set_guideline_orientation
        assertNoError(() => {
            bus.execute({ type: 'workspace/set_guideline_orientation', orientation: 'horizontal' });
            const snapshot = state.getSnapshot();
            if (snapshot.guidelineOrientation !== 'horizontal') throw new Error('Orientation not set');
        }, 'workspace/set_guideline_orientation');
        passedTests++;

        // Test 3: workspace/set_drawing_mode
        assertNoError(() => {
            bus.execute({ type: 'workspace/set_drawing_mode', mode: 'chain' });
            const snapshot = state.getSnapshot();
            if (snapshot.drawingMode !== 'chain') throw new Error('Drawing mode not set');
        }, 'workspace/set_drawing_mode');
        passedTests++;

        // Test 4: workspace/set_show_measurements
        assertNoError(() => {
            bus.execute({ type: 'workspace/set_show_measurements', show: false });
            const snapshot = state.getSnapshot();
            if (snapshot.showMeasurements !== false) throw new Error('Measurements flag not set');
        }, 'workspace/set_show_measurements');
        passedTests++;

        // Test 5: workspace/set_walls_locked
        assertNoError(() => {
            bus.execute({ type: 'workspace/set_walls_locked', locked: true });
            const snapshot = state.getSnapshot();
            if (snapshot.wallsLocked !== true) throw new Error('Walls lock flag not set');
        }, 'workspace/set_walls_locked');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Basic Interaction Commands ==========
    console.log('\n🖱️  Basic Interactions');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 6: workspace/click
        assertNoError(() => {
            bus.execute({ type: 'workspace/select_tool', tool: 'line' });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
        }, 'workspace/click');
        passedTests++;

        // Test 7: workspace/update_cursor
        assertNoError(() => {
            bus.execute({ type: 'workspace/update_cursor', point: createTestPoint(5, 5) });
        }, 'workspace/update_cursor');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Selection Commands ==========
    console.log('\n🎯 Selection & Transformation');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Create a shape first
        bus.execute({ type: 'workspace/select_tool', tool: 'rectangle' });
        bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
        bus.execute({ type: 'workspace/click', point: createTestPoint(10, 10) });
        const shapeId = state.getSnapshot().shapes[0]?.id;

        // Test 8: workspace/select_shapes
        assertNoError(() => {
            bus.execute({ type: 'workspace/select_shapes', ids: [shapeId], append: false });
            const snapshot = state.getSnapshot();
            if (!snapshot.selectedShapeIds.includes(shapeId)) throw new Error('Shape not selected');
        }, 'workspace/select_shapes');
        passedTests++;

        // Test 9: workspace/move_selection
        assertNoError(() => {
            bus.execute({ type: 'workspace/move_selection', delta: createTestPoint(1, 1) });
        }, 'workspace/move_selection');
        passedTests++;

        // Test 9b: workspace/move_selection respects wall lock constraint
        assertNoError(() => {
            const lockedState = new WorkspaceState();
            const lockedBus = new WorkspaceCommandBus(lockedState);
            lockedBus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(5, 0) });
            const createdSnapshot = lockedState.getSnapshot();
            const initialWall = createdSnapshot.shapes.find((shape): shape is WallShape => shape.type === 'wall');
            if (!initialWall) throw new Error('Wall not created');
            const wallId = initialWall.id;

            const getWall = (): WallShape => {
                const snapshot = lockedState.getSnapshot();
                const wall = snapshot.shapes.find((shape): shape is WallShape => shape.id === wallId && shape.type === 'wall');
                if (!wall) {
                    throw new Error('Wall missing');
                }
                return wall;
            };

            lockedBus.execute({ type: 'workspace/select_shapes', ids: [wallId] });
            lockedBus.execute({ type: 'workspace/set_walls_locked', locked: true });

            lockedBus.execute({ type: 'workspace/move_selection', delta: createTestPoint(1, 0.25) });
            let wall = getWall();
            expectClose(wall.centerline[0].x, 1, 'Locked horizontal start x');
            expectClose(wall.centerline[wall.centerline.length - 1].x, 6, 'Locked horizontal end x');
            expectClose(wall.centerline[0].y, 0, 'Locked horizontal start y');
            expectClose(wall.centerline[wall.centerline.length - 1].y, 0, 'Locked horizontal end y');

            lockedBus.execute({ type: 'workspace/move_selection', delta: createTestPoint(0.25, 2) });
            wall = getWall();
            expectClose(wall.centerline[0].x, 1, 'Locked vertical start x');
            expectClose(wall.centerline[wall.centerline.length - 1].x, 6, 'Locked vertical end x');
            expectClose(wall.centerline[0].y, 2, 'Locked vertical start y');
            expectClose(wall.centerline[wall.centerline.length - 1].y, 2, 'Locked vertical end y');

            lockedBus.execute({ type: 'workspace/set_walls_locked', locked: false });
            lockedBus.execute({ type: 'workspace/move_selection', delta: createTestPoint(0.5, 0.5) });
            wall = getWall();
            expectClose(wall.centerline[0].x, 1.5, 'Unlocked move start x');
            expectClose(wall.centerline[wall.centerline.length - 1].x, 6.5, 'Unlocked move end x');
            expectClose(wall.centerline[0].y, 2.5, 'Unlocked move start y');
            expectClose(wall.centerline[wall.centerline.length - 1].y, 2.5, 'Unlocked move end y');
        }, 'workspace/move_selection.locked_axis');
        passedTests++;

        // Test 9c: workspace/snap_selected_walls_orthogonal
        assertNoError(() => {
            const snapState = new WorkspaceState();
            const snapBus = new WorkspaceCommandBus(snapState);
            snapBus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(3, 4) });
            const wallId = snapState.getSnapshot().shapes.find((shape): shape is WallShape => shape.type === 'wall')?.id;
            if (!wallId) throw new Error('Failed to create wall for ortho snap');
            snapBus.execute({ type: 'workspace/select_shapes', ids: [wallId] });
            snapBus.execute({ type: 'workspace/snap_selected_walls_orthogonal' });
            const snappedWall = snapState.getSnapshot().shapes.find((shape): shape is WallShape => shape.id === wallId && shape.type === 'wall');
            if (!snappedWall) throw new Error('Wall missing after ortho snap');
            expectClose(snappedWall.centerline[0].x, 0, 'Snap start x');
            expectClose(snappedWall.centerline[0].y, 0, 'Snap start y');
            expectClose(snappedWall.centerline[snappedWall.centerline.length - 1].y, 0, 'Snap end y');
            expectClose(snappedWall.centerline[snappedWall.centerline.length - 1].x, 5, 'Snap end x');
        }, 'workspace/snap_selected_walls_orthogonal');
        passedTests++;

        // Test 9d: workspace/rotate_selection
        assertNoError(() => {
            const rotateState = new WorkspaceState();
            const rotateBus = new WorkspaceCommandBus(rotateState);
            rotateBus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(5, 0) });
            const wallId = rotateState.getSnapshot().shapes.find((shape): shape is WallShape => shape.type === 'wall')?.id;
            if (!wallId) throw new Error('Failed to create wall for rotation');
            rotateBus.execute({ type: 'workspace/select_shapes', ids: [wallId] });
            rotateBus.execute({ type: 'workspace/rotate_selection', angle: 90 });
            const rotatedWall = rotateState.getSnapshot().shapes.find((shape): shape is WallShape => shape.type === 'wall');
            if (!rotatedWall) throw new Error('Wall missing after rotation');
            expectClose(rotatedWall.centerline[0].x, 2.5, 'Rotate start x');
            expectClose(rotatedWall.centerline[0].y, -2.5, 'Rotate start y');
            expectClose(rotatedWall.centerline[rotatedWall.centerline.length - 1].x, 2.5, 'Rotate end x');
            expectClose(rotatedWall.centerline[rotatedWall.centerline.length - 1].y, 2.5, 'Rotate end y');
        }, 'workspace/rotate_selection');
        passedTests++;

        // Test 10: workspace/delete_selection
        assertNoError(() => {
            const before = state.getSnapshot().shapes.length;
            bus.execute({ type: 'workspace/delete_selection' });
            const after = state.getSnapshot().shapes.length;
            if (before === after) throw new Error('Shape not deleted');
        }, 'workspace/delete_selection');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Shape Resize Commands ==========
    console.log('\n📏 Shape Resizing');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 11: workspace/resize_line_handle
        assertNoError(() => {
            bus.execute({ type: 'workspace/select_tool', tool: 'line' });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
            bus.execute({ type: 'workspace/click', point: createTestPoint(5, 5) });
            const lineId = state.getSnapshot().shapes[0]?.id;
            bus.execute({ type: 'workspace/select_shapes', ids: [lineId] });
            bus.execute({ type: 'workspace/resize_line_handle', point: createTestPoint(10, 10), handle: 'end' });
        }, 'workspace/resize_line_handle');
        passedTests++;

        // Test 12: workspace/resize_polyline_corner
        assertNoError(() => {
            bus.execute({ type: 'workspace/resize_polyline_corner', point: createTestPoint(8, 8), corner: 'br' });
        }, 'workspace/resize_polyline_corner');
        passedTests++;

        // Test 13: workspace/resize_rectangle_edge
        assertNoError(() => {
            const state2 = new WorkspaceState();
            const bus2 = new WorkspaceCommandBus(state2);
            bus2.execute({ type: 'workspace/select_tool', tool: 'rectangle' });
            bus2.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
            bus2.execute({ type: 'workspace/click', point: createTestPoint(10, 10) });
            const rectId = state2.getSnapshot().shapes[0]?.id;
            bus2.execute({ type: 'workspace/select_shapes', ids: [rectId] });
            bus2.execute({ type: 'workspace/resize_rectangle_edge', point: createTestPoint(12, 10), edge: 'right' });
        }, 'workspace/resize_rectangle_edge');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Drawing State Commands ==========
    console.log('\n✏️  Drawing State');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 14: workspace/confirm_current_shape
        assertNoError(() => {
            bus.execute({ type: 'workspace/select_tool', tool: 'circle' });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
            bus.execute({ type: 'workspace/update_cursor', point: createTestPoint(5, 0) });
            bus.execute({ type: 'workspace/confirm_current_shape' });
        }, 'workspace/confirm_current_shape');
        passedTests++;

        // Test 15: workspace/commit_chain_session
        assertNoError(() => {
            bus.execute({ type: 'workspace/set_drawing_mode', mode: 'chain' });
            bus.execute({ type: 'workspace/select_tool', tool: 'line' });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
            bus.execute({ type: 'workspace/click', point: createTestPoint(5, 5) });
            bus.execute({ type: 'workspace/commit_chain_session' });
        }, 'workspace/commit_chain_session');
        passedTests++;

        // Test 16: workspace/abort_chain_session
        assertNoError(() => {
            bus.execute({ type: 'workspace/set_drawing_mode', mode: 'chain' });
            bus.execute({ type: 'workspace/select_tool', tool: 'line' });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
            bus.execute({ type: 'workspace/click', point: createTestPoint(5, 5) });
            bus.execute({ type: 'workspace/abort_chain_session' });
        }, 'workspace/abort_chain_session');
        passedTests++;

        // Test 17: workspace/cancel_drawing
        assertNoError(() => {
            bus.execute({ type: 'workspace/select_tool', tool: 'rectangle' });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
            bus.execute({ type: 'workspace/cancel_drawing' });
        }, 'workspace/cancel_drawing');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== History Commands ==========
    console.log('\n⏮️  History Management');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Create some history
        bus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(5, 0) });

        // Test 18: workspace/undo
        assertNoError(() => {
            const beforeUndo = state.getSnapshot().shapes.length;
            bus.execute({ type: 'workspace/undo' });
            const afterUndo = state.getSnapshot().shapes.length;
            if (beforeUndo === afterUndo) console.warn('⚠️  Undo did not change shapes');
        }, 'workspace/undo');
        passedTests++;

        // Test 19: workspace/redo
        assertNoError(() => {
            bus.execute({ type: 'workspace/redo' });
        }, 'workspace/redo');
        passedTests++;

        // Test 20: workspace/reset
        assertNoError(() => {
            bus.execute({ type: 'workspace/reset' });
            const snapshot = state.getSnapshot();
            if (snapshot.shapes.length !== 0) throw new Error('State not reset');
        }, 'workspace/reset');
        passedTests++;

        // Test 21: workspace/apply_snapshot
        assertNoError(() => {
            const customSnapshot = state.getSnapshot();
            bus.execute({ type: 'workspace/apply_snapshot', snapshot: customSnapshot });
        }, 'workspace/apply_snapshot');
        passedTests++;

        // Test 22: workspace/history_begin_batch
        assertNoError(() => {
            bus.execute({ type: 'workspace/history_begin_batch', source: 'test' });
        }, 'workspace/history_begin_batch');
        passedTests++;

        // Test 23: workspace/history_commit_batch
        assertNoError(() => {
            bus.execute({ type: 'workspace/history_commit_batch' });
        }, 'workspace/history_commit_batch');
        passedTests++;

        // Test 24: workspace/history_cancel_batch
        assertNoError(() => {
            bus.execute({ type: 'workspace/history_begin_batch', source: 'test-cancel' });
            bus.execute({ type: 'workspace/history_cancel_batch' });
        }, 'workspace/history_cancel_batch');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Wall Commands ==========
    console.log('\n🧱 Wall Operations');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 25: workspace/wall_begin
        assertNoError(() => {
            bus.execute({ type: 'workspace/wall_begin', point: createTestPoint(0, 0), options: { thickness: 0.15 } });
            if (!state.getSnapshot().isDrawing) throw new Error('Wall drawing not started');
        }, 'workspace/wall_begin');
        passedTests++;

        // Test 26: workspace/wall_update
        assertNoError(() => {
            bus.execute({ type: 'workspace/wall_update', point: createTestPoint(5, 0) });
        }, 'workspace/wall_update');
        passedTests++;

        // Test 27: workspace/wall_commit
        assertNoError(() => {
            const before = state.getSnapshot().shapes.length;
            bus.execute({ type: 'workspace/wall_commit' });
            const after = state.getSnapshot().shapes.length;
            if (before >= after) throw new Error('Wall not committed');
        }, 'workspace/wall_commit');
        passedTests++;

        // Test 28: workspace/wall_cancel
        assertNoError(() => {
            bus.execute({ type: 'workspace/wall_begin', point: createTestPoint(10, 0) });
            bus.execute({ type: 'workspace/wall_cancel' });
            if (state.getSnapshot().isDrawing) throw new Error('Wall drawing not cancelled');
        }, 'workspace/wall_cancel');
        passedTests++;

        // Test 29: workspace/create_wall
        assertNoError(() => {
            const before = state.getSnapshot().shapes.length;
            bus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 5), end: createTestPoint(10, 5) });
            const after = state.getSnapshot().shapes.length;
            if (before >= after) throw new Error('Wall not created');
        }, 'workspace/create_wall');
        passedTests++;

        // Test 30: workspace/wall_rectangle
        assertNoError(() => {
            const before = state.getSnapshot().shapes.length;
            bus.execute({ type: 'workspace/wall_rectangle', start: createTestPoint(0, 10), end: createTestPoint(10, 20) });
            const after = state.getSnapshot().shapes.length;
            if (before >= after) throw new Error('Wall rectangle not created');
        }, 'workspace/wall_rectangle');
        passedTests++;

        // Test 31: workspace/wall_offset
        assertNoError(() => {
            const walls = state.getSnapshot().shapes.filter(s => s.type === 'wall');
            if (walls.length > 0) {
                bus.execute({ type: 'workspace/wall_offset', wallId: walls[0].id, distance: 1, direction: 'left' });
            }
        }, 'workspace/wall_offset');
        passedTests++;

        // Test 32: workspace/wall_set_thickness
        assertNoError(() => {
            bus.execute({ type: 'workspace/wall_begin', point: createTestPoint(20, 0) });
            bus.execute({ type: 'workspace/wall_set_thickness', thickness: 0.2 });
            bus.execute({ type: 'workspace/wall_cancel' });
        }, 'workspace/wall_set_thickness');
        passedTests++;

        // Test 33: workspace/wall_set_alignment
        assertNoError(() => {
            bus.execute({ type: 'workspace/wall_begin', point: createTestPoint(25, 0) });
            bus.execute({ type: 'workspace/wall_set_alignment', alignment: 'inside' });
            bus.execute({ type: 'workspace/wall_cancel' });
        }, 'workspace/wall_set_alignment');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Selected Wall Commands ==========
    console.log('\n🔧 Selected Wall Modifications');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Create and select a wall
        bus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(10, 0) });
        const wallId = state.getSnapshot().shapes.find(s => s.type === 'wall')?.id;
        if (!wallId) throw new Error('No wall created for testing');
        bus.execute({ type: 'workspace/select_shapes', ids: [wallId] });

        // Test 34: workspace/selected_wall_set_thickness
        assertNoError(() => {
            bus.execute({ type: 'workspace/selected_wall_set_thickness', thickness: 0.25 });
        }, 'workspace/selected_wall_set_thickness');
        passedTests++;

        // Test 35: workspace/selected_wall_set_height
        assertNoError(() => {
            bus.execute({ type: 'workspace/selected_wall_set_height', height: 3.5 });
        }, 'workspace/selected_wall_set_height');
        passedTests++;

        // Test 36: workspace/selected_wall_set_length
        assertNoError(() => {
            bus.execute({ type: 'workspace/selected_wall_set_length', length: 12 });
        }, 'workspace/selected_wall_set_length');
        passedTests++;

        // Test 37: workspace/selected_wall_set_alignment
        assertNoError(() => {
            bus.execute({ type: 'workspace/selected_wall_set_alignment', alignment: 'outside' });
        }, 'workspace/selected_wall_set_alignment');
        passedTests++;

        // Test 38: workspace/wall_resize_handle
        assertNoError(() => {
            bus.execute({ type: 'workspace/wall_resize_handle', point: createTestPoint(15, 0), handle: 'end' });
        }, 'workspace/wall_resize_handle');
        passedTests++;

        // Test 39: workspace/wall_set_control_point
        assertNoError(() => {
            bus.execute({ type: 'workspace/wall_set_control_point', point: createTestPoint(7.5, 2) });
            // Clear control point
            bus.execute({ type: 'workspace/wall_set_control_point', point: null });
        }, 'workspace/wall_set_control_point');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // Additional: ensure wall translations glide connected endpoints even when walls are unlocked
    console.log('\n🧱 Wall Connectivity');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 40: wall_glide_preserves_connections
        assertNoError(() => {
            let wallAId: string | null = null;
            let wallBId: string | null = null;

            // Create a horizontal wall
            bus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(5, 0) });
            const firstSnapshot = state.getSnapshot();
            wallAId = firstSnapshot.shapes[firstSnapshot.shapes.length - 1]?.id ?? null;

            // Create a vertical wall connected at the same endpoint
            bus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(0, 5) });
            const secondSnapshot = state.getSnapshot();
            wallBId = secondSnapshot.shapes[secondSnapshot.shapes.length - 1]?.id ?? null;

            if (!wallAId || !wallBId) {
                throw new Error('Failed to create test walls');
            }

            // Select only the vertical wall and move it sideways by 1 unit
            bus.execute({ type: 'workspace/select_shapes', ids: [wallBId] });
            bus.execute({ type: 'workspace/move_selection', delta: createTestPoint(1, 0) });

            const snapshot = state.getSnapshot();
            const horizontalWall = snapshot.shapes.find(
                (shape): shape is WallShape => shape.type === 'wall' && shape.id === wallAId
            );
            const verticalWall = snapshot.shapes.find(
                (shape): shape is WallShape => shape.type === 'wall' && shape.id === wallBId
            );

            if (!horizontalWall || !verticalWall) {
                throw new Error('Walls missing after move');
            }

            const tolerance = 1e-6;
            const horizontalStart = horizontalWall.centerline[0];
            const verticalStart = verticalWall.centerline[0];

            if (Math.abs(horizontalStart.x - 1) > tolerance || Math.abs(verticalStart.x - 1) > tolerance) {
                throw new Error('Connected walls did not glide together');
            }
        }, 'wall_glide_preserves_connections');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Room Commands ==========
    console.log('\n🏠 Room Operations');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 41: workspace/create_room
        assertNoError(() => {
            bus.execute({
                type: 'workspace/create_room',
                points: [createTestPoint(0, 0), createTestPoint(10, 0), createTestPoint(10, 10), createTestPoint(0, 10)],
                label: 'Test Room'
            });
            const room = state.getSnapshot().shapes.find(s => s.type === 'room');
            if (!room) throw new Error('Room not created');
        }, 'workspace/create_room');
        passedTests++;

        // Test 42: workspace/selected_room_set_label
        assertNoError(() => {
            const roomId = state.getSnapshot().shapes.find(s => s.type === 'room')?.id;
            if (roomId) {
                bus.execute({ type: 'workspace/select_shapes', ids: [roomId] });
                bus.execute({ type: 'workspace/selected_room_set_label', label: 'Living Room' });
            }
        }, 'workspace/selected_room_set_label');
        passedTests++;

        // Test 43: workspace/resize_room_corner
        assertNoError(() => {
            const roomId = state.getSnapshot().shapes.find(s => s.type === 'room')?.id;
            if (roomId) {
                bus.execute({ type: 'workspace/select_shapes', ids: [roomId] });
                bus.execute({ type: 'workspace/resize_room_corner', point: createTestPoint(12, 12), corner: 'br' });
            }
        }, 'workspace/resize_room_corner');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Opening Commands ==========
    console.log('\n🚪 Opening Operations');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Create a wall for openings
        bus.execute({ type: 'workspace/create_wall', start: createTestPoint(0, 0), end: createTestPoint(10, 0) });

        // Test 44: workspace/opening_begin
        assertNoError(() => {
            bus.execute({ type: 'workspace/opening_begin', point: createTestPoint(5, 0), options: { category: 'door' } });
        }, 'workspace/opening_begin');
        passedTests++;

        // Test 45: workspace/opening_update
        assertNoError(() => {
            bus.execute({ type: 'workspace/opening_update', point: createTestPoint(5.5, 0) });
        }, 'workspace/opening_update');
        passedTests++;

        // Test 46: workspace/opening_commit
        assertNoError(() => {
            bus.execute({ type: 'workspace/opening_commit' });
        }, 'workspace/opening_commit');
        passedTests++;

        // Test 47: workspace/opening_cancel
        assertNoError(() => {
            bus.execute({ type: 'workspace/opening_begin', point: createTestPoint(7, 0) });
            bus.execute({ type: 'workspace/opening_cancel' });
        }, 'workspace/opening_cancel');
        passedTests++;

        // Test 48: workspace/opening_insert
        assertNoError(() => {
            bus.execute({ type: 'workspace/opening_insert', point: createTestPoint(2, 0), options: { category: 'window' } });
        }, 'workspace/opening_insert');
        passedTests++;

        // Test 49: workspace/selected_opening_set_size
        assertNoError(() => {
            const openingId = state.getSnapshot().shapes.find(s => s.type === 'opening')?.id;
            if (openingId) {
                bus.execute({ type: 'workspace/select_shapes', ids: [openingId] });
                bus.execute({ type: 'workspace/selected_opening_set_size', width: 1.2, height: 2.5 });
            }
        }, 'workspace/selected_opening_set_size');
        passedTests++;

        // Test 50: workspace/selected_opening_set_category
        assertNoError(() => {
            const openingId = state.getSnapshot().shapes.find(s => s.type === 'opening')?.id;
            if (openingId) {
                bus.execute({ type: 'workspace/select_shapes', ids: [openingId] });
                bus.execute({ type: 'workspace/selected_opening_set_category', category: 'door' });
            }
        }, 'workspace/selected_opening_set_category');
        passedTests++;

        // Test 51: workspace/opening_flip
        assertNoError(() => {
            const openingId = state.getSnapshot().shapes.find(s => s.type === 'opening')?.id;
            if (openingId) {
                bus.execute({ type: 'workspace/opening_flip', openingId, flipState: { direction: 'out' } });
            }
        }, 'workspace/opening_flip');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Zone Commands ==========
    console.log('\n📐 Zone Operations');

    try {
        const state = new WorkspaceState();
        const bus = new WorkspaceCommandBus(state);

        // Test 52: workspace/zone_commit
        assertNoError(() => {
            bus.execute({ type: 'workspace/select_tool', tool: 'zone' });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 0) });
            bus.execute({ type: 'workspace/click', point: createTestPoint(5, 0) });
            bus.execute({ type: 'workspace/click', point: createTestPoint(5, 5) });
            bus.execute({ type: 'workspace/click', point: createTestPoint(0, 5) });
            bus.execute({ type: 'workspace/zone_commit' });
            const zone = state.getSnapshot().shapes.find(s => s.type === 'zone');
            if (!zone) throw new Error('Zone not created');
        }, 'workspace/zone_commit');
        passedTests++;

    } catch (error) {
        failedTests++;
    }

    // ========== Results Summary ==========
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${passedTests + failedTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));

    if (failedTests === 0) {
        console.log('\n🎉 All commands executed successfully!\n');
        return true;
    } else {
        console.log('\n⚠️  Some commands failed. Review errors above.\n');
        return false;
    }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const success = runWorkspaceCommandTests();
    process.exit(success ? 0 : 1);
}
