#!/usr/bin/env python3
"""
Test script for Workspace Bridge communication.
This starts the WebSocket server and tests basic communication.
"""

import asyncio
import json
from src.bridge import get_bridge

async def test_bridge():
    """Test bridge server and basic communication."""
    print("🧪 Testing Workspace Bridge...")
    
    # Get bridge instance
    bridge = get_bridge(port=8765)
    
    # Create a task for the server
    server_task = asyncio.create_task(bridge.start())
    
    # Give server time to start
    await asyncio.sleep(2)
    
    print("✅ Bridge server started on ws://localhost:8765")
    print("📡 Waiting for TypeScript client to connect...")
    print("\nTo test from TypeScript:")
    print("1. Open your browser console")
    print("2. Run: const ws = new WebSocket('ws://localhost:8765')")
    print("3. Send test message: ws.send(JSON.stringify({type: 'get_snapshot'}))")
    
    # Keep server running
    try:
        await server_task
    except KeyboardInterrupt:
        print("\n🛑 Bridge server stopped")

if __name__ == "__main__":
    asyncio.run(test_bridge())
