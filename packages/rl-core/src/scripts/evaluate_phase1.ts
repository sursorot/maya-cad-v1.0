import * as fs from 'fs';
import * as path from 'path';
import { PPOAgent } from '../agents/PPOAgent';
import { WorkspaceEnv } from '../workspaceEnv';
import { mapActionToCommand } from '../training/actionMapping';
import { encodePrompt, encodeState } from '../training/encoders';
import * as tf from '@tensorflow/tfjs';

async function evaluate() {
    try {
        console.log('Starting Phase 1 Evaluation...');

        // 1. Load Dataset
        const datasetPath = path.join(process.cwd(), 'src/data/phase1_dataset.json');
        if (!fs.existsSync(datasetPath)) {
            console.error(`Dataset not found at ${datasetPath}. Please run generate_phase1_dataset.ts first.`);
            process.exit(1);
        }
        const rawData = fs.readFileSync(datasetPath, 'utf-8');
        const dataset = JSON.parse(rawData);
        console.log(`Loaded ${dataset.examples.length} examples.`);

        // 2. Load Agent
        const agent = new PPOAgent();
        const modelPath = path.join(process.cwd(), 'models/phase1_v1');
        if (!fs.existsSync(modelPath)) {
            console.error(`Model not found at ${modelPath}. Please run train_phase1.ts first.`);
            process.exit(1);
        }

        console.log(`Loading model from ${modelPath}...`);
        await agent.load(modelPath);

        // 3. Run Evaluation
        const env = new WorkspaceEnv();
        let totalReward = 0;
        let solvedCount = 0;

        console.log('Running evaluation episodes...');

        for (let i = 0; i < dataset.examples.length; i++) {
            const example = dataset.examples[i];
            await env.reset(example);
            let done = false;
            let episodeReward = 0;
            let steps = 0;

            while (!done) {
                const validActions = env.getValidActions();

                // Select action (deterministic for evaluation? or stochastic? usually deterministic for eval)
                // But our selectAction samples. We might want a "greedy" mode or just sample.
                // For now, we'll use the standard selectAction which samples.
                // To be truly rigorous we might want argmax, but PPOAgent.selectAction doesn't expose that yet.
                // We'll stick to sampling for now as it reflects the policy's distribution.

                const { action, params } = await agent.selectAction(example.prompt, env.state, validActions);
                const command = mapActionToCommand(action, params);

                let result;
                if (command) {
                    result = await env.step(command, action);
                } else {
                    result = await env.step({ type: 'workspace/update_cursor', point: { x: 0, y: 0 } });
                }

                episodeReward += result.reward;
                done = result.stop.done;
                steps++;
            }

            totalReward += episodeReward;
            if (episodeReward >= 0.9) { // Threshold for "solved"
                solvedCount++;
            }

            if ((i + 1) % 10 === 0) {
                console.log(`Processed ${i + 1}/${dataset.examples.length} examples.`);
            }
        }

        const avgReward = totalReward / dataset.examples.length;
        const successRate = (solvedCount / dataset.examples.length) * 100;

        console.log('\nEvaluation Results:');
        console.log(`Average Reward: ${avgReward.toFixed(3)}`);
        console.log(`Success Rate: ${successRate.toFixed(1)}%`);

    } catch (error) {
        console.error('Evaluation failed:', error);
        process.exit(1);
    }
}

evaluate();
