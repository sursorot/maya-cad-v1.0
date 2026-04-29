import * as fs from 'fs';
import * as path from 'path';
// import { v4 as uuidv4 } from 'uuid';
import { WorkspaceState } from '@maya/workspace-domain/workspace/core/WorkspaceState';
import { ToolManager } from '@maya/workspace-domain/workspace/core/managers/ToolManager';
import { GeometryManager } from '@maya/workspace-domain/workspace/core/managers/GeometryManager';
import { SelectionManager } from '@maya/workspace-domain/workspace/core/managers/SelectionManager';
import type { TrainingExample, TrainingDataset } from '../types';
import type { CircleShape, RectangleShape } from '../../components/Workspace/types';

function generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Setup managers
// const selectionManager = new SelectionManager();
// const geometryManager = new GeometryManager();
// const toolManager = new ToolManager(selectionManager, geometryManager);

function generateCircleExample(): TrainingExample {
    const state = new WorkspaceState();

    // Random parameters
    const centerX = Math.random() * 8 + 1; // 1-9
    const centerY = Math.random() * 8 + 1; // 1-9
    const radius = Math.random() * 2 + 0.5; // 0.5-2.5

    // Create target shape
    const circle: CircleShape = {
        type: 'circle',
        id: generateId(),
        center: { x: centerX, y: centerY },
        radius: radius,
        cursorPoint: { x: centerX + radius, y: centerY }, // Approximate cursor pos
        stroke: '#000000',
        strokeWidth: 1
    };

    // Manually inject into state for target
    // We can't easily use toolManager to "draw" it perfectly without simulating events,
    // so we'll construct the snapshot directly for the target.
    // But WorkspaceState doesn't allow direct shape injection easily without using internal draft.
    // However, we can just construct the snapshot object.

    const targetSnapshot = {
        ...state.getSnapshot(),
        shapes: [circle]
    };

    return {
        id: generateId(),
        prompt: "Draw a circle",
        difficulty: 'level-1',
        targetSnapshot: targetSnapshot,
        constraints: {
            dimensions: { width: 10, height: 10 },
            features: ['circle']
        },
        createdAt: new Date().toISOString()
    };
}

function generateRectangleExample(): TrainingExample {
    const state = new WorkspaceState();

    // Random parameters
    const startX = Math.random() * 5 + 1;
    const startY = Math.random() * 5 + 1;
    const width = Math.random() * 3 + 1;
    const height = Math.random() * 3 + 1;

    const rect: RectangleShape = {
        type: 'rectangle',
        id: generateId(),
        start: { x: startX, y: startY },
        end: { x: startX + width, y: startY + height },
        stroke: '#000000',
        strokeWidth: 1
    };

    const targetSnapshot = {
        ...state.getSnapshot(),
        shapes: [rect]
    };

    return {
        id: generateId(),
        prompt: "Draw a rectangle",
        difficulty: 'level-1',
        targetSnapshot: targetSnapshot,
        constraints: {
            dimensions: { width: 10, height: 10 },
            features: ['rectangle']
        },
        createdAt: new Date().toISOString()
    };
}

function generateDataset(count: number): TrainingDataset {
    const examples: TrainingExample[] = [];

    for (let i = 0; i < count; i++) {
        if (Math.random() > 0.5) {
            examples.push(generateCircleExample());
        } else {
            examples.push(generateRectangleExample());
        }
    }

    return {
        version: '1.0.0-phase1',
        created: new Date().toISOString(),
        examples
    };
}

// Main execution
const COUNT = 100;
// Use process.cwd() to get the project root
const OUTPUT_PATH = path.join(process.cwd(), 'src/data/phase1_dataset.json');

// Ensure directory exists
const dir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const dataset = generateDataset(COUNT);
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dataset, null, 2));

console.log(`Generated ${COUNT} examples to ${OUTPUT_PATH}`);
