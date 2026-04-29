export const RL_CONFIG = {
    // Input Dimensions
    PROMPT_EMBEDDING_DIM: 64, // Dimension for the prompt embedding (e.g., hashed n-grams)
    STATE_DIM: 256,           // Dimension for the flattened workspace state

    // Output Dimensions
    ACTION_SPACE_SIZE: 48,    // Number of discrete commands (e.g., "DRAW_WALL", "ADD_WINDOW")
    PARAM_OUTPUT_DIM: 4,      // Continuous parameters: [x, y, width, height] (normalized 0-1)

    // Training Hyperparameters
    LEARNING_RATE: 0.001,
    GAMMA: 0.99,              // Discount factor
    GAE_LAMBDA: 0.95,         // GAE parameter
    CLIP_RATIO: 0.2,          // PPO clip ratio
    EPOCHS: 10,               // Training epochs per update
    BATCH_SIZE: 32,

    // Network Architecture
    HIDDEN_LAYERS: [256, 128],
};
