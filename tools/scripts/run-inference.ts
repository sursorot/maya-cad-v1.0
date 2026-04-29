import { fileURLToPath } from 'url';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs';
import { PPOAgent } from '../../packages/rl-core/src/agents/PPOAgent';
import { WorkspaceEnv } from '../../packages/rl-core/src/workspaceEnv';
import { mapActionToCommand } from '../../packages/rl-core/src/training/actionMapping';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runInference(prompt: string, modelPath: string) {
    console.log(`Loading model from ${modelPath}...`);

    const agent = new PPOAgent();
    try {
        await agent.load(modelPath);
        console.log('Model loaded successfully.');
    } catch (error) {
        console.error('Failed to load model:', error);
        return;
    }

    const env = new WorkspaceEnv();
    // Initialize environment (optional, but good practice)
    await env.reset({
        id: 'inference-1',
        difficulty: 1,
        createdAt: Date.now(),
        prompt,
        targetSnapshot: { shapes: [] } as any,
        constraints: {}
    } as any);

    console.log(`Running inference for prompt: "${prompt}"`);

    let done = false;
    let step = 0;
    const maxSteps = 20;
    const commands: any[] = [];

    while (!done && step < maxSteps) {
        step++;

        // Select action (deterministic for inference? or sample?)
        // Usually for inference we might want deterministic (argmax), but selectAction samples.
        // For now, we'll use the sampling as implemented.
        const { action, params, value } = await agent.selectAction(prompt, env.state);

        const command = mapActionToCommand(action, params);

        if (command) {
            console.log(`Step ${step}: Action ${action} -> ${command.type}`);
            commands.push(command);

            const result = await env.step(command);
            done = result.stop.done;

            if (result.reward !== 0) {
                console.log(`  Reward: ${result.reward.toFixed(2)}`);
            }
        } else {
            console.log(`Step ${step}: Action ${action} -> Invalid/Noop`);
            // Prevent infinite loops on invalid actions
            const result = await env.step({ type: 'workspace/update_cursor', point: { x: 0, y: 0 } });
            done = result.stop.done;
        }
    }

    console.log('Inference complete.');
    console.log(`Total steps: ${step}`);
    console.log('Generated commands:', commands.length);

    // Here we could save the final snapshot to a file if needed
}

async function main() {
    const modelPath = path.join(__dirname, '../../data/models/ppo-agent');
    const prompt = process.argv[2] || "Create a 10x12 room with a door";

    await runInference(prompt, modelPath);
}

main().catch(console.error);
