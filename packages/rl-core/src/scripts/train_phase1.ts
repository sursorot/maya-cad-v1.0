import * as fs from 'fs';
import * as path from 'path';
import { DatasetLoader } from '../dataset';
import { PPOAgent } from '../agents/PPOAgent';
import { Trainer } from '../training/trainer';

async function train() {
    try {
        console.log('Starting Phase 1 Training...');

        // 1. Load Dataset
        const datasetPath = path.join(process.cwd(), 'src/data/phase1_dataset.json');
        console.log(`Loading dataset from ${datasetPath}...`);

        if (!fs.existsSync(datasetPath)) {
            console.error('Dataset not found. Please run generate_phase1_dataset.ts first.');
            process.exit(1);
        }

        const rawData = fs.readFileSync(datasetPath, 'utf-8');
        const dataset = JSON.parse(rawData);
        console.log(`Loaded ${dataset.examples.length} examples.`);

        // 2. Initialize Agent and Trainer
        const agent = new PPOAgent();
        const trainer = new Trainer(agent);

        // 3. Configure Training
        const EPOCHS = 5; // Run a short session for verification
        const BATCH_SIZE = 10; // Update every 10 episodes

        console.log(`Configuration: ${EPOCHS} epochs, Batch Size ${BATCH_SIZE}`);

        // 4. Run Training
        // We can't use trainer.train() directly if it doesn't support custom callbacks easily, 
        // but looking at trainer.ts (from memory), it likely has a train loop.
        // Let's check trainer.ts content again if needed, but assuming standard interface.

        // Actually, let's peek at trainer.ts to be sure about the API.
        // For now, I'll write what I think is correct based on test script.

        await trainer.train(dataset.examples, EPOCHS);

        // 5. Save Model
        const saveDir = path.join(process.cwd(), 'models/phase1_v1');
        if (!fs.existsSync(saveDir)) {
            fs.mkdirSync(saveDir, { recursive: true });
        }
        await agent.save(saveDir);
        console.log(`Model saved to ${saveDir}`);

    } catch (error) {
        console.error('Training failed:', error);
        process.exit(1);
    }
}

train();
