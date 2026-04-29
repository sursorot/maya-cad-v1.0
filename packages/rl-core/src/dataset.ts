/**
 * Dataset Loader for RL Training
 * 
 * Loads and provides access to training examples from the consolidated dataset.
 */

import type { TrainingExample, TrainingDataset, DifficultyLevel } from './types';

export class DatasetLoader {
    private dataset: TrainingDataset | null = null;

    /**
     * Load dataset from a JSON file or URL
     */
    async load(path: string): Promise<TrainingDataset> {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load dataset from ${path}: ${response.statusText}`);
        }
        this.dataset = await response.json();
        if (!this.dataset) {
            throw new Error('Failed to parse dataset JSON');
        }
        return this.dataset;
    }

    /**
     * Get all examples, optionally filtered by difficulty
     */
    getExamples(difficulty?: DifficultyLevel): TrainingExample[] {
        if (!this.dataset) {
            throw new Error('Dataset not loaded. Call load() first.');
        }

        if (difficulty) {
            return this.dataset.examples.filter(ex => ex.difficulty === difficulty);
        }
        return this.dataset.examples;
    }

    /**
     * Get a specific example by ID
     */
    getById(id: string): TrainingExample | undefined {
        if (!this.dataset) {
            throw new Error('Dataset not loaded. Call load() first.');
        }
        return this.dataset.examples.find(ex => ex.id === id);
    }

    /**
     * Get a random example, optionally filtered by difficulty
     */
    getRandom(difficulty?: DifficultyLevel): TrainingExample {
        const examples = this.getExamples(difficulty);
        if (examples.length === 0) {
            throw new Error(`No examples found${difficulty ? ` for difficulty ${difficulty}` : ''}`);
        }
        return examples[Math.floor(Math.random() * examples.length)];
    }

    /**
     * Get dataset statistics
     */
    getStats() {
        if (!this.dataset) {
            throw new Error('Dataset not loaded. Call load() first.');
        }

        const byDifficulty = {
            'level-1': 0,
            'level-2': 0,
            'level-3': 0,
            'level-4': 0,
        };

        this.dataset.examples.forEach(ex => {
            byDifficulty[ex.difficulty]++;
        });

        return {
            total: this.dataset.examples.length,
            version: this.dataset.version,
            created: this.dataset.created,
            byDifficulty,
        };
    }

    /**
     * Split dataset into training and validation sets
     */
    split(validationRatio: number = 0.2): {
        training: TrainingExample[];
        validation: TrainingExample[];
    } {
        if (!this.dataset) {
            throw new Error('Dataset not loaded. Call load() first.');
        }

        const examples = [...this.dataset.examples];
        // Shuffle
        for (let i = examples.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [examples[i], examples[j]] = [examples[j], examples[i]];
        }

        const splitIndex = Math.floor(examples.length * (1 - validationRatio));
        return {
            training: examples.slice(0, splitIndex),
            validation: examples.slice(splitIndex),
        };
    }
}
