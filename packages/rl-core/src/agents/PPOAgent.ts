import * as tf from '@tensorflow/tfjs';
import { PolicyNetwork } from '../networks/policyNetwork';
import { RL_CONFIG } from '../config';
import { WorkspaceState } from '@maya/workspace-domain/workspace/core';
import { encodePrompt, encodeState } from '../training/encoders';

export class PPOAgent {
    public policy: PolicyNetwork;
    private optimizer: tf.Optimizer;

    constructor() {
        this.policy = new PolicyNetwork();
        this.optimizer = tf.train.adam(RL_CONFIG.LEARNING_RATE);
    }

    /**
     * Selects an action based on the current observation.
     * Returns the action index, continuous parameters, and the estimated value.
     */
    async selectAction(prompt: string, state: WorkspaceState, validActions?: number[]): Promise<{
        action: number;
        params: number[];
        value: number;
        logProb: number;
    }> {
        return tf.tidy(() => {
            const promptEmb = encodePrompt(prompt);
            const stateEmb = encodeState(state);

            let { actionProbs, params, value } = this.policy.predict(promptEmb, stateEmb);

            // Apply action masking if provided
            if (validActions) {
                const maskTensor = tf.tensor1d(validActions);
                // Multiply probs by mask
                let maskedProbs = actionProbs.mul(maskTensor);

                // Re-normalize
                const sum = maskedProbs.sum();
                // Avoid division by zero if all valid actions have 0 prob (shouldn't happen with softmax but good to be safe)
                // If sum is 0, fall back to uniform distribution over valid actions
                const isZero = sum.equal(0).dataSync()[0];
                if (isZero) {
                    const count = validActions.reduce((a, b) => a + b, 0);
                    maskedProbs = maskTensor.div(count);
                } else {
                    maskedProbs = maskedProbs.div(sum);
                }
                actionProbs = maskedProbs;
            }

            // Sample discrete action from probability distribution
            // Cast to Tensor1D for multinomial compatibility
            const actionIndex = tf.multinomial(actionProbs as tf.Tensor1D, 1).dataSync()[0];

            // Get parameters (already normalized 0-1)
            const actionParams = Array.from(params.dataSync()).slice(0, 4); // Assuming batch size 1

            // Calculate log probability of the selected action
            // log_prob = log(prob[actionIndex])
            const prob = actionProbs.slice([0, actionIndex], [1, 1]);
            // Add epsilon to avoid log(0)
            const logProb = prob.add(1e-10).log().dataSync()[0];

            return {
                action: actionIndex,
                params: actionParams,
                value: value.dataSync()[0],
                logProb
            };
        }); // End tidy (tensors created inside are disposed, but we extracted data)
    }

    /**
     * Updates the policy using a batch of experiences.
     * This is a simplified PPO update step.
     */
    async update(batch: {
        prompts: tf.Tensor;
        states: tf.Tensor;
        actions: tf.Tensor;
        oldLogProbs: tf.Tensor;
        returns: tf.Tensor;
        advantages: tf.Tensor;
    }) {
        const { prompts, states, actions, oldLogProbs, returns, advantages } = batch;

        // PPO Loss Function
        const lossFunction = () => {
            return tf.tidy(() => {
                const { actionProbs, value } = this.policy.predict(prompts, states);

                // Calculate new log probs for the taken actions
                // This requires gathering probabilities for specific action indices
                // tf.gather is useful here, or one-hot encoding
                const actionIndices = actions.toInt();
                const oneHotActions = tf.oneHot(actionIndices, RL_CONFIG.ACTION_SPACE_SIZE);
                const newProbs = actionProbs.mul(oneHotActions).sum(1);
                const newLogProbs = newProbs.log();

                // Ratio = exp(newLogProb - oldLogProb)
                const ratio = newLogProbs.sub(oldLogProbs).exp();

                // Surrogate losses
                const surr1 = ratio.mul(advantages);
                const surr2 = tf.clipByValue(ratio, 1.0 - RL_CONFIG.CLIP_RATIO, 1.0 + RL_CONFIG.CLIP_RATIO).mul(advantages);

                // Policy Loss (Maximize objective -> Minimize negative)
                const policyLoss = tf.minimum(surr1, surr2).mean().neg();

                // Value Loss (MSE)
                // Flatten value to match returns shape if needed
                const valueLoss = tf.losses.meanSquaredError(returns, value.reshape([-1]));

                // Total Loss
                // Entropy bonus could be added here for exploration
                const c1 = 0.5; // Value coefficient
                return policyLoss.add(valueLoss.mul(c1));
            });
        };

        // Perform optimization step
        // Cast lossFunction return value and trainable weights for type compatibility
        this.optimizer.minimize(() => lossFunction() as tf.Scalar, true);

        // Clean up
        // In a real loop, we'd be careful about tensor disposal. 
        // The optimizer.minimize handles gradients, but we should ensure no leaks.
    }

    /**
     * Saves the agent's policy network.
     */
    async save(dirPath: string) {
        await this.policy.save(dirPath);
    }

    /**
     * Loads the agent's policy network.
     */
    async load(dirPath: string) {
        await this.policy.load(dirPath);
    }
}
