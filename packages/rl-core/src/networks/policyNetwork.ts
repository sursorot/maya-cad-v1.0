import * as tf from '@tensorflow/tfjs';
import { RL_CONFIG } from '../config';

export class PolicyNetwork {
    model: tf.LayersModel;

    constructor() {
        this.model = this.buildModel();
    }

    private buildModel(): tf.LayersModel {
        // Inputs
        const promptInput = tf.input({ shape: [RL_CONFIG.PROMPT_EMBEDDING_DIM], name: 'prompt_input' });
        const stateInput = tf.input({ shape: [RL_CONFIG.STATE_DIM], name: 'state_input' });

        // Concatenate inputs
        const concatenated = tf.layers.concatenate().apply([promptInput, stateInput]);

        // Shared Backbone (Feature Extractor)
        let x = concatenated;
        for (const units of RL_CONFIG.HIDDEN_LAYERS) {
            x = tf.layers.dense({ units, activation: 'relu' }).apply(x);
        }

        // Actor Head (Discrete Actions)
        const actionLogits = tf.layers.dense({
            units: RL_CONFIG.ACTION_SPACE_SIZE,
            activation: 'softmax', // Output probabilities directly for now, or linear for logits
            name: 'action_head'
        }).apply(x) as tf.SymbolicTensor;

        // Parameter Head (Continuous Parameters: x, y, w, h)
        // Using sigmoid to bound outputs between 0 and 1 (normalized coordinates)
        const paramOutput = tf.layers.dense({
            units: RL_CONFIG.PARAM_OUTPUT_DIM,
            activation: 'sigmoid',
            name: 'param_head'
        }).apply(x) as tf.SymbolicTensor;

        // Critic Head (Value Function)
        const valueOutput = tf.layers.dense({
            units: 1,
            activation: 'linear',
            name: 'value_head'
        }).apply(x) as tf.SymbolicTensor;

        // Create Model
        const model = tf.model({
            inputs: [promptInput, stateInput],
            outputs: [actionLogits, paramOutput, valueOutput]
        });

        return model;
    }

    /**
     * Predicts action, parameters, and value for a given observation.
     */
    predict(promptEmbedding: tf.Tensor, state: tf.Tensor): {
        actionProbs: tf.Tensor;
        params: tf.Tensor;
        value: tf.Tensor;
    } {
        return tf.tidy(() => {
            const [actionProbs, params, value] = this.model.predict([promptEmbedding, state]) as tf.Tensor[];
            return { actionProbs, params, value };
        });
    }

    /**
     * Loads weights from a JSON file (or other source).
     */
    async load(dirPath: string) {
        // Check if running in browser
        if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
            // Browser environment: Load via HTTP
            // dirPath should be a URL path, e.g., '/models/ppo-agent'
            // tf.loadLayersModel expects a path to model.json
            const modelUrl = `${dirPath}/model.json`;
            this.model = await tf.loadLayersModel(modelUrl);
            return;
        }

        // Custom IOHandler for Node.js without tfjs-node
        const ioHandler: tf.io.IOHandler = {
            save: async () => ({ modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } }),
            load: async () => {
                if (typeof window === 'undefined') {
                    // Node.js environment - use file system
                    // @ts-expect-error - Dynamic import for Node.js only
                    const fs = await import('fs');
                    // @ts-expect-error - Dynamic import for Node.js only
                    const path = await import('path');

                    const modelJsonPath = path.join(dirPath, 'model.json');
                    const weightsPath = path.join(dirPath, 'weights.bin');

                    const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));

                    // Handle the structure we saved: { modelTopology: ..., weightsManifest: ... }
                    // tf.loadLayersModel expects the topology object directly if passed as modelTopology
                    // But our saved JSON has it nested under 'modelTopology' key if we saved it that way.
                    // Let's check if it's nested.
                    const topology = modelJson.modelTopology || modelJson;

                    // Load weights
                    let weightData: ArrayBuffer | undefined;
                    if (fs.existsSync(weightsPath)) {
                        const buffer = fs.readFileSync(weightsPath);
                        weightData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                    }

                    const manifestPath = path.join(dirPath, 'weights_manifest.json');
                    let weightSpecs: tf.io.WeightsManifestEntry[] = [];

                    // If manifest is in model.json (which we did in save), use that
                    if (modelJson.weightsManifest) {
                        weightSpecs = modelJson.weightsManifest[0].weights;
                    } else if (fs.existsSync(manifestPath)) {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        weightSpecs = manifest[0].weights;
                    }

                    return {
                        modelTopology: topology,
                        weightSpecs: weightSpecs,
                        weightData: weightData
                    };
                }
                throw new Error('Loading from file system is only supported in Node.js environment.');
            }
        };

        this.model = await tf.loadLayersModel(ioHandler);
    }

    /**
   * Saves the model to the specified path.
   * Note: Without tfjs-node, we must manually save the artifacts.
   */
    async save(dirPath: string) {
        // Helper to save model artifacts manually
        await this.model.save(tf.io.withSaveHandler(async (artifacts) => {
            if (typeof window === 'undefined') {
                // Node.js environment - use file system
                // @ts-expect-error - Dynamic import for Node.js only
                const fs = await import('fs');
                // @ts-expect-error - Dynamic import for Node.js only  
                const path = await import('path');

                if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

                // Save weights
                if (artifacts.weightData) {
                    // weightData is ArrayBuffer. Convert to Buffer.
                    // @ts-ignore
                    const buffer = Buffer.from(artifacts.weightData);
                    fs.writeFileSync(path.join(dirPath, 'weights.bin'), buffer);
                }

                // Create weights manifest
                const weightsManifest = artifacts.weightSpecs ? [{
                    paths: ['weights.bin'],
                    weights: artifacts.weightSpecs
                }] : [];

                // Save model.json in TensorFlow.js standard format
                // This format is compatible with tf.loadLayersModel in browser
                const modelJson = {
                    modelTopology: artifacts.modelTopology,
                    weightsManifest: weightsManifest,
                    format: 'layers-model',
                    generatedBy: 'TensorFlow.js tfjs-layers v4.22.0',
                    convertedBy: null
                };

                fs.writeFileSync(path.join(dirPath, 'model.json'), JSON.stringify(modelJson));

                return {
                    modelArtifactsInfo: {
                        dateSaved: new Date(),
                        modelTopologyType: 'JSON',
                        weightDataBytes: artifacts.weightData ? (artifacts.weightData as ArrayBuffer).byteLength : 0
                    }
                };
            }
            throw new Error('Saving to file system is only supported in Node.js environment.');
        }));
    }
}
