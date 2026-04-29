import { fileURLToPath } from 'url';
import * as path from 'path';
import * as tf from '@tensorflow/tfjs';
import { PPOAgent } from '../../packages/rl-core/src/agents/PPOAgent';
import { encodePrompt, encodeState } from '../../packages/rl-core/src/training/encoders';
import { WorkspaceEnv } from '../../packages/rl-core/src/workspaceEnv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * SUPERVISED LEARNING: Directly teach prompt → action mappings
 * This bypasses RL and uses supervised learning to guarantee specific outputs
 */

interface TrainingPair {
    prompt: string;
    targetAction: number;
    description: string;
}

// Define our supervised training examples
const trainingData: TrainingPair[] = [
    { prompt: "create a rectangle", targetAction: 1, description: "wall_rectangle" },
    { prompt: "create a room", targetAction: 1, description: "wall_rectangle" },
    { prompt: "make a rectangular room", targetAction: 1, description: "wall_rectangle" },
    { prompt: "create a 10x12 room", targetAction: 1, description: "wall_rectangle" },
    { prompt: "draw a rectangle", targetAction: 1, description: "wall_rectangle" },
    { prompt: "add a door", targetAction: 10, description: "insert_door" },
    { prompt: "insert door", targetAction: 10, description: "insert_door" },
    { prompt: "place a door", targetAction: 10, description: "insert_door" },
    { prompt: "add a window", targetAction: 11, description: "insert_window" },
    { prompt: "insert window", targetAction: 11, description: "insert_window" },
    { prompt: "place a window", targetAction: 11, description: "insert_window" },
];

async function main() {
    console.log('=== SUPERVISED LEARNING BOOTSTRAP ===\n');
    console.log(`Training on ${trainingData.length} prompt → action pairs\n`);

    // Initialize agent
    const agent = new PPOAgent();
    const env = new WorkspaceEnv();

    // Get empty state for encoding
    const emptyState = env.state;

    // Prepare training data as tensors
    console.log('Preparing training data...');
    const promptTensors: tf.Tensor[] = [];
    const targetTensors: tf.Tensor[] = [];

    for (const pair of trainingData) {
        const promptTensor = encodePrompt(pair.prompt);
        const stateTensor = encodeState(emptyState);
        const targetTensor = tf.oneHot([pair.targetAction], 48);

        promptTensors.push(promptTensor);
        targetTensors.push(targetTensor);
    }

    // Create optimizer
    const learningRate = 0.01;
    const optimizer = tf.train.adam(learningRate);

    console.log('Training for 1000 epochs...\n');

    // Training loop
    for (let epoch = 0; epoch < 1000; epoch++) {
        let totalLoss = 0;

        // Train on all examples
        for (let i = 0; i < trainingData.length; i++) {
            const loss = optimizer.minimize(() => {
                const predictions = agent.policy.predict(promptTensors[i], encodeState(emptyState));
                const actionProbs = predictions.actionProbs;

                // Ensure shapes match: both should be [1, 48] or both [48]
                const target = targetTensors[i];

                // Cross-entropy loss
                const lossValue = tf.losses.softmaxCrossEntropy(
                    target,
                    actionProbs
                );

                return lossValue as any;
            }, true);

            if (loss) {
                const lossData = await loss.data();
                totalLoss += lossData[0];
                loss.dispose();
            }
        }

        // Log progress
        if (epoch % 100 === 0) {
            const avgLoss = totalLoss / trainingData.length;
            console.log(`Epoch ${epoch}/1000 - Avg Loss: ${avgLoss.toFixed(6)}`);

            // Test on a few examples
            if (epoch % 200 === 0) {
                console.log('\n--- Testing predictions ---');
                for (let i = 0; i < Math.min(3, trainingData.length); i++) {
                    const pair = trainingData[i];
                    const result = await agent.selectAction(pair.prompt, emptyState);
                    const correct = result.action === pair.targetAction;
                    console.log(`  "${pair.prompt}" → Action ${result.action} ${correct ? '✓' : '✗'} (target: ${pair.targetAction})`);
                }
                console.log('');
            }
        }
    }

    // Final verification
    console.log('\n=== FINAL VERIFICATION ===');
    let correctCount = 0;
    for (const pair of trainingData) {
        const result = await agent.selectAction(pair.prompt, emptyState);
        const correct = result.action === pair.targetAction;
        if (correct) correctCount++;
        console.log(`"${pair.prompt}" → Action ${result.action} ${correct ? '✓' : '✗'} (expected: ${pair.targetAction} ${pair.description})`);
    }

    const accuracy = (correctCount / trainingData.length * 100).toFixed(1);
    console.log(`\nAccuracy: ${correctCount}/${trainingData.length} = ${accuracy}%`);

    // Clean up tensors
    promptTensors.forEach(t => t.dispose());
    targetTensors.forEach(t => t.dispose());

    if (correctCount >= trainingData.length * 0.9) {
        // Save model
        const modelDir = path.join(__dirname, '../../data/models/ppo-agent');
        await agent.save(modelDir);
        console.log(`\n✅ Model saved to ${modelDir}`);
        console.log('Deploy with: cp -r data/models/ppo-agent/* public/models/ppo-agent/');
    } else {
        console.log('\n❌ Accuracy too low, not saving model');
        console.log('Try increasing epochs or learning rate');
    }
}

main().catch(console.error);
