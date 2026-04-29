import * as fs from 'fs';
import { DatasetLoader } from '../dataset';
import { PPOAgent } from '../agents/PPOAgent';
import { Trainer } from '../training/trainer';
import * as path from 'path';

async function runTest() {
    try {
        // 1. Load Dataset
        const loader = new DatasetLoader();
        const datasetPath = path.join(process.cwd(), 'src/data/phase1_dataset.json');
        console.log(`Loading dataset from ${datasetPath}...`);
        // We need to use file:// protocol for fetch if using the original loader, 
        // OR just read file directly since we are in node environment here.
        // The original loader uses `fetch` which might not work in node without polyfill or local file support.
        // Let's just mock the load for this test script or assume we can read it.

        // Actually, let's just read the file directly to avoid fetch issues in this test script
        const rawData = fs.readFileSync(datasetPath, 'utf-8');
        const dataset = JSON.parse(rawData);

        console.log(`Loaded ${dataset.examples.length} examples.`);

        // 2. Initialize Agent
        console.log('Initializing PPO Agent...');
        const agent = new PPOAgent();
        // await agent.initialize(); // Not needed/doesn't exist

        // 3. Initialize Trainer
        console.log('Initializing Trainer...');
        const trainer = new Trainer(agent);

        // 4. Run Training (Short run)
        console.log('Starting training session (1 epoch)...');
        await trainer.train(dataset.examples, 1);

        console.log('Training session completed successfully.');

    } catch (error) {
        console.error('Training test failed:', error);
        process.exit(1);
    }
}

runTest();
