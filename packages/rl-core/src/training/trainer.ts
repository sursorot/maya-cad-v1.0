
import * as tf from '@tensorflow/tfjs';
import { PPOAgent } from '../agents/PPOAgent';
import { WorkspaceEnv } from '../workspaceEnv';
import type { TrainingExample } from '../types'; // Assuming types exists
import { mapActionToCommand } from './actionMapping';
import { RL_CONFIG } from '../config';
import { encodePrompt, encodeState } from './encoders';

export class Trainer {
    private agent: PPOAgent;
    private env: WorkspaceEnv;

    constructor(agent: PPOAgent) {
        this.agent = agent;
        this.env = new WorkspaceEnv();
    }

    /**
     * Runs the training loop for a specified number of epochs.
     */
    async train(dataset: TrainingExample[], epochs: number = RL_CONFIG.EPOCHS) {
        console.log(`Starting training for ${epochs} epochs on ${dataset.length} examples...`);

        for (let epoch = 0; epoch < epochs; epoch++) {
            let totalReward = 0;

            // Shuffle dataset
            const shuffled = [...dataset].sort(() => Math.random() - 0.5);

            // Collect batch of experiences
            // For PPO, we usually collect N steps (rollouts) then update.
            // Here we'll do episode-based updates for simplicity or mini-batches.

            const batchPrompts: tf.Tensor[] = [];
            const batchStates: tf.Tensor[] = [];
            const batchActions: number[] = [];
            const batchOldLogProbs: number[] = [];
            const batchReturns: number[] = [];
            const batchAdvantages: number[] = [];

            for (const example of shuffled) {
                // Run Episode
                const episode = await this.runEpisode(example);

                // Process Episode for PPO (Compute Advantages)
                const { states, actions, rewards, values, logProbs, prompts } = episode;

                // GAE (Generalized Advantage Estimation)
                let gae = 0;
                const returns = new Array(rewards.length).fill(0);
                const advantages = new Array(rewards.length).fill(0);

                // Iterate backwards
                for (let t = rewards.length - 1; t >= 0; t--) {
                    const delta = rewards[t] + RL_CONFIG.GAMMA * (values[t + 1] || 0) - values[t];
                    gae = delta + RL_CONFIG.GAMMA * RL_CONFIG.GAE_LAMBDA * gae;
                    advantages[t] = gae;
                    returns[t] = advantages[t] + values[t];
                }

                // Accumulate to batch
                // Ideally we stack tensors here or keep as arrays and stack later
                // For TFJS, stacking many small tensors is slow. Better to keep data arrays.
                // But our encoders return tensors. We should extract data or concat.

                // For MVP simplicity, we'll just push to arrays and handle tensor conversion in update
                // But we need to be careful with memory.
                // Let's just store the raw data if possible, or keep tensors and tidy them.

                // Actually, `states` are tensors. We should keep them.
                batchStates.push(...states);
                batchPrompts.push(...prompts);
                batchActions.push(...actions);
                batchOldLogProbs.push(...logProbs);
                batchReturns.push(...returns);
                batchAdvantages.push(...advantages);

                totalReward += rewards.reduce((a, b) => a + b, 0);

                // Update if batch size reached
                if (batchActions.length >= RL_CONFIG.BATCH_SIZE) {
                    await this.performUpdate(batchPrompts, batchStates, batchActions, batchOldLogProbs, batchReturns, batchAdvantages);

                    // Clear batch
                    batchPrompts.forEach(t => t.dispose());
                    batchStates.forEach(t => t.dispose());
                    batchPrompts.length = 0;
                    batchStates.length = 0;
                    batchActions.length = 0;
                    batchOldLogProbs.length = 0;
                    batchReturns.length = 0;
                    batchAdvantages.length = 0;
                }
            }



            // Cleanup leftover tensors in partial batch
            if (batchPrompts.length > 0) {
                batchPrompts.forEach(t => t.dispose());
                batchStates.forEach(t => t.dispose());
            }

            console.log(`Epoch ${epoch + 1} /${epochs} complete. Avg Reward: ${totalReward / dataset.length}`);
        }
    }


    private async runEpisode(example: TrainingExample) {
        await this.env.reset(example);
        let done = false;

        const states: tf.Tensor[] = [];
        const prompts: tf.Tensor[] = [];
        const actions: number[] = [];
        const rewards: number[] = [];
        const values: number[] = [];
        const logProbs: number[] = [];

        // Initial state
        // We need to encode state here to pass to agent
        // But encoders take WorkspaceState (the class), not Snapshot.
        // We need to fix encoders or pass the class.
        // WorkspaceEnv exposes `.state` which is the class.

        while (!done) {
            const promptEmb = encodePrompt(example.prompt);
            const stateEmb = encodeState(this.env.state);

            // Get valid actions mask
            const validActions = this.env.getValidActions();

            // Select Action
            const { action, params, value, logProb } = await this.agent.selectAction(example.prompt, this.env.state, validActions);

            // Execute Action
            const command = mapActionToCommand(action, params);
            let reward = 0;

            if (command) {
                const result = await this.env.step(command, action); // Pass action index for reward calculation
                reward = result.reward;
                done = result.stop.done;
                // currentState = result.snapshot;
            } else {
                // Invalid action penalty
                reward = -0.1;
                // Check if we should stop or just continue
                // For now, continue but maybe limit steps (env handles max steps)
                // Use a harmless command to advance the step
                const result = await this.env.step({
                    type: 'workspace/update_cursor',
                    point: { x: 0, y: 0 } // Arbitrary point
                });
                done = result.stop.done;
            }

            // Store experience
            states.push(stateEmb);
            prompts.push(promptEmb);
            actions.push(action);
            rewards.push(reward);
            values.push(value);
            logProbs.push(logProb);
        }

        return { states, prompts, actions, rewards, values, logProbs };
    }

    private async performUpdate(
        prompts: tf.Tensor[],
        states: tf.Tensor[],
        actions: number[],
        oldLogProbs: number[],
        returns: number[],
        advantages: number[]
    ) {
        // Convert arrays to batched tensors
        const batchPrompts = tf.concat(prompts);
        const batchStates = tf.concat(states);
        const batchActions = tf.tensor1d(actions, 'int32');
        const batchOldLogProbs = tf.tensor1d(oldLogProbs);
        const batchReturns = tf.tensor1d(returns);
        const batchAdvantages = tf.tensor1d(advantages);

        await this.agent.update({
            prompts: batchPrompts,
            states: batchStates,
            actions: batchActions,
            oldLogProbs: batchOldLogProbs,
            returns: batchReturns,
            advantages: batchAdvantages
        });

        // Dispose batched tensors (agent update should not dispose inputs if it doesn't own them, 
        // but here we created them just for the call, so we dispose them)
        batchPrompts.dispose();
        batchStates.dispose();
        batchActions.dispose();
        batchOldLogProbs.dispose();
        batchReturns.dispose();
        batchAdvantages.dispose();
    }
}
