/**
 * Test script for Tinker Bridge (TypeScript side).
 * Run this to verify bridge communication from browser.
 */

import { TinkerBridge } from './bridge';

export async function testBridge() {
    console.log('🧪 Testing Tinker Bridge...');

    const bridge = new TinkerBridge();

    // Listen for events
    bridge.on('log', (message) => {
        console.log('[Bridge Log]', message);
    });

    bridge.on('error', (error) => {
        console.error('[Bridge Error]', error);
    });

    bridge.on('complete', ({ exitCode }) => {
        console.log(`[Bridge] Process exited with code ${exitCode}`);
    });

    // Test command execution
    console.log('📤 Testing command execution...');
    const result = await bridge.executeCommand({
        type: 'workspace/select_tool',
        tool: 'circle'
    });
    console.log('✅ Command result:', result);

    // Test snapshot retrieval
    console.log('📸 Testing snapshot retrieval...');
    const snapshot = await bridge.getWorkspaceSnapshot();
    console.log('✅ Snapshot:', snapshot);

    return { success: true, result, snapshot };
}

// Export for console testing
if (typeof window !== 'undefined') {
    (window as any).testBridge = testBridge;
}
