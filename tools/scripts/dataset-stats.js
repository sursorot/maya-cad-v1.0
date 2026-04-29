#!/usr/bin/env node

/**
 * Dataset Statistics Script
 * 
 * Shows statistics about the training dataset
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const datasetPath = path.join(__dirname, '../../data/datasets/training-examples.json');

if (!fs.existsSync(datasetPath)) {
    console.error('❌ Dataset not found at:', datasetPath);
    console.log('Run the consolidation script first.');
    process.exit(1);
}

const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

console.log('\n📊 Dataset Statistics\n');
console.log(`Version: ${dataset.version}`);
console.log(`Created: ${dataset.created}`);
console.log(`Total Examples: ${dataset.totalExamples}\n`);

// Count by difficulty
const byDifficulty = {
    'level-1': 0,
    'level-2': 0,
    'level-3': 0,
    'level-4': 0,
};

dataset.examples.forEach(ex => {
    byDifficulty[ex.difficulty]++;
});

console.log('By Difficulty:');
console.log(`  Level 1 (Simple):   ${byDifficulty['level-1']}`);
console.log(`  Level 2 (Features): ${byDifficulty['level-2']}`);
console.log(`  Level 3 (Complex):  ${byDifficulty['level-3']}`);
console.log(`  Level 4 (Advanced): ${byDifficulty['level-4']}`);

// Count by shape types
const shapeTypes = {};
dataset.examples.forEach(ex => {
    ex.targetSnapshot.shapes.forEach(shape => {
        shapeTypes[shape.type] = (shapeTypes[shape.type] || 0) + 1;
    });
});

console.log('\nShape Types:');
Object.entries(shapeTypes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });

// Sample prompts
console.log('\nSample Prompts:');
dataset.examples.slice(0, 5).forEach((ex, i) => {
    console.log(`  ${i + 1}. "${ex.prompt}"`);
});

console.log('\n✅ Dataset ready for training!\n');
