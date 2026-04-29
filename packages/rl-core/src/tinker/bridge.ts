import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { getWorkspaceController } from './controller';

export interface TrainingConfig {
    baseModel: string;
    loraRank: number;
    batchSize: number;
    numIterations: number;
}

export interface TrainingMetrics {
    iteration: number;
    reward: number;
    loss?: number;
    timestamp: number;
}

/**
 * Bridge between TypeScript and Python Tinker training.
 * Spawns Python process and communicates via stdout/stdin.
 */
export class TinkerBridge extends EventEmitter {
    private pythonProcess: ChildProcess | null = null;
    private isTraining: boolean = false;

    constructor() {
        super();
    }

    /**
     * Start a training session with the given config.
     */
    async startTraining(config: TrainingConfig): Promise<void> {
        if (this.isTraining) {
            throw new Error('Training already in progress');
        }

        const pythonPath = path.resolve(process.cwd(), 'packages/adapters/tinker-adapter/venv/bin/python');
        const scriptPath = path.resolve(process.cwd(), 'packages/adapters/tinker-adapter/scripts/train_basic.py');

        this.pythonProcess = spawn(pythonPath, [scriptPath], {
            env: {
                ...process.env,
                BASE_MODEL: config.baseModel,
                LORA_RANK: config.loraRank.toString(),
                BATCH_SIZE: config.batchSize.toString(),
            },
        });

        this.isTraining = true;

        // Handle stdout (metrics and logs)
        this.pythonProcess.stdout?.on('data', (data: Buffer) => {
            const output = data.toString();
            console.log('[Tinker]', output);

            // Try to parse as JSON metrics
            try {
                const metrics = JSON.parse(output);
                this.emit('metrics', metrics as TrainingMetrics);
            } catch {
                // Not JSON, just a log message
                this.emit('log', output);
            }
        });

        // Handle stderr
        this.pythonProcess.stderr?.on('data', (data: Buffer) => {
            console.error('[Tinker Error]', data.toString());
            this.emit('error', data.toString());
        });

        // Handle process exit
        this.pythonProcess.on('close', (code: number | null) => {
            this.isTraining = false;
            this.emit('complete', { exitCode: code });
        });
    }

    /**
   * Execute a workspace command from Python.
   * This will be called via IPC.
   */
    async executeCommand(command: any): Promise<any> {
        const controller = getWorkspaceController();
        if (!controller) {
            console.error('[TinkerBridge] No workspace controller available');
            return { success: false, error: 'No controller' };
        }

        try {
            switch (command.type) {
                case 'workspace/select_tool':
                    controller.selectTool(command.tool);
                    break;

                case 'workspace/click':
                    controller.click(command.point);
                    break;

                case 'workspace/delete':
                    controller.deleteSelection();
                    break;

                default:
                    console.warn('[TinkerBridge] Unknown command type:', command.type);
                    return { success: false, error: 'Unknown command' };
            }

            return { success: true };
        } catch (error) {
            console.error('[TinkerBridge] Command execution error:', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * Get current workspace snapshot.
     */
    async getWorkspaceSnapshot(): Promise<any> {
        const controller = getWorkspaceController();
        if (!controller) {
            return { shapes: [], error: 'No controller' };
        }

        const snapshot = controller.snapshot;
        return {
            shapes: snapshot.shapes || [],
            activeTool: snapshot.activeTool,
            viewBox: snapshot.viewBox,
        };
    }

    /**
     * Stop the training process.
     */
    stopTraining(): void {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.isTraining = false;
        }
    }

    /**
     * Check if training is in progress.
     */
    get training(): boolean {
        return this.isTraining;
    }
}
