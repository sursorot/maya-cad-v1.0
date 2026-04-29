import { fileURLToPath } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs'; // Fallback to pure JS if node bindings fail
import { PPOAgent } from '../../packages/rl-core/src/agents/PPOAgent';
import { Trainer } from '../../packages/rl-core/src/training/trainer';
import { TrainingExample, TrainingDataset } from '../../packages/rl-core/src/types';
import { RL_CONFIG } from '../../packages/rl-core/src/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadDataset(dataDir: string): Promise<TrainingExample[]> {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f.startsWith('example-'));
    const examples: TrainingExample[] = [];

    console.log(`Loading ${files.length} examples from ${dataDir}...`);

    for (const file of files) {
        const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
        try {
            const example = JSON.parse(content) as TrainingExample;
            examples.push(example);
        } catch (e) {
            console.warn(`Failed to parse ${file}:`, e);
        }
    }

    return examples;
}

async function main() {
    // Initialize TensorFlow backend
    // tfjs-node is imported, so it should register itself.
    // If tfjs-node failed to install, we might need to fallback to pure tfjs (cpu)
    // But we are in a node script, so we need some backend.
    // If tfjs-node is missing, we can try require('@tensorflow/tfjs') but it uses webgl/cpu.
    // Since we installed @tensorflow/tfjs, we can use it if tfjs-node is missing.

    try {
        console.log('Backend:', tf.getBackend());
    } catch (e) {
        console.log('Using CPU backend via @tensorflow/tfjs');
        require('@tensorflow/tfjs');
    }

    const dataDir = path.join(__dirname, '../../packages/rl-core/src/data');
    const dataset = await loadDataset(dataDir);

    if (dataset.length === 0) {
        console.error('No training examples found!');
        process.exit(1);
    }

    // Initialize Agent
    const agent = new PPOAgent();

    // Initialize Trainer
    const trainer = new Trainer(agent);

    // Run Training
    console.log('Starting training...');
    await trainer.train(dataset, 50); // Updated epochs to 50

    // Save Model
    const modelDir = path.join(__dirname, '../../data/models/ppo-agent');
    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    await agent.save(modelDir);
    console.log(`Model saved to ${modelDir}`);
}

main().catch(console.error);
