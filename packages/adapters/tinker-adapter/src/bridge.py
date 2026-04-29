"""
WebSocket server for TypeScript ↔ Python communication.
Handles command execution requests and returns workspace snapshots.
"""

import asyncio
import json
import time
import uuid
from typing import Any, Dict

import websockets
from websockets.server import WebSocketServerProtocol

HANDSHAKE_VERSIONS = {
    "bridge_version": "1.0",
    "workspace_contract_version": "1.0.0",
    "tdc_version": "1.0.0",
    "reward_version": "1.0",
}

DEFAULT_THROTTLE = {
    "maxCommandsPerSecond": 50,
    "maxOutstandingRequests": 128,
    "burstMultiplier": 2,
}


class BridgeThrottleError(Exception):
    """Raised when a client exceeds the negotiated throttle limits."""


class WorkspaceBridge:
    """
    WebSocket server that bridges Python Tinker training with TypeScript workspace.
    """

    def __init__(self, port: int = 8765):
        self.port = port
        self.websocket: WebSocketServerProtocol | None = None
        self._pending: Dict[str, asyncio.Future] = {}
        self._handshake_complete = False
        self._session_id: str | None = None
        self._granted_throttle = DEFAULT_THROTTLE.copy()
        self._command_timestamps: list[float] = []
        self._metrics_task: asyncio.Task | None = None

    async def handle_client(self, websocket: WebSocketServerProtocol):
        """Handle incoming WebSocket connections."""
        self.websocket = websocket
        self._handshake_complete = False
        self._session_id = None
        self._command_timestamps.clear()
        print(f"✅ Bridge connected on port {self.port}")

        try:
            async for message in websocket:
                data = json.loads(message)
                await self._handle_incoming(data)
        except websockets.exceptions.ConnectionClosed:
            print("❌ Bridge connection closed")
        finally:
            self._handshake_complete = False
            self.websocket = None
            self._stop_metrics_task()
            for future in self._pending.values():
                if not future.done():
                    future.set_exception(ConnectionError("Bridge connection closed"))
            self._pending.clear()

    async def _handle_incoming(self, data: Dict[str, Any]):
        """Handle incoming messages from TypeScript by resolving pending futures."""
        msg_type = data.get("type")
        request_id = data.get("requestId")

        if msg_type == "hello":
            await self._handle_hello(data)
            return

        if not self._handshake_complete:
            print("⚠️  Received message before handshake completion; ignoring.")
            return

        if msg_type in {"command_response", "snapshot_response"} and request_id:
            future = self._pending.pop(request_id, None)
            if future and not future.done():
                future.set_result(data)
            return

        if msg_type == "metrics":
            # Relay metrics upstream if needed later; for now, just log.
            print(f"📊 Bridge metrics from client: {data}")
            return

        print(f"ℹ️  Unhandled message from bridge: {data}")

    async def _handle_hello(self, data: Dict[str, Any]):
        """Process handshake hello messages and reply with hello_ack."""
        requested = data.get("requestedThrottle", {})
        self._granted_throttle = self._grant_throttle(requested)
        self._session_id = uuid.uuid4().hex

        await self._send({
            "type": "hello_ack",
            "session_id": self._session_id,
            **HANDSHAKE_VERSIONS,
            "grantedThrottle": self._granted_throttle,
            "capabilities": ["command", "snapshot", "metrics"],
        })

        self._handshake_complete = True
        self._start_metrics_task()

    def _grant_throttle(self, requested: Dict[str, Any]) -> Dict[str, int]:
        throttle = DEFAULT_THROTTLE.copy()
        if not isinstance(requested, dict):
            return throttle

        for key in ("maxCommandsPerSecond", "maxOutstandingRequests"):
            value = requested.get(key)
            if isinstance(value, int) and value > 0:
                throttle[key] = min(throttle[key], value)

        requested_burst = requested.get("burstMultiplier")
        if isinstance(requested_burst, int) and requested_burst > 0:
            throttle["burstMultiplier"] = min(throttle["burstMultiplier"], requested_burst)

        return throttle

    async def execute_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send a command to TypeScript workspace and wait for result.
        """
        if not self.websocket or not self._handshake_complete:
            return {"type": "command_response", "ok": False, "error": {"code": "BRIDGE_NOT_READY"}}

        try:
            self._enforce_throttle_limits()
        except BridgeThrottleError as error:
            return {
                "type": "command_response",
                "ok": False,
                "error": {"code": "BRIDGE_THROTTLED", "message": str(error)},
            }

        request_id = self._register_request()

        await self._send({
            "type": "command_request",
            "command": command,
            "requestId": request_id,
        })

        response = await self._pending[request_id]
        return response

    async def get_snapshot(self) -> Dict[str, Any]:
        """Request current workspace snapshot from TypeScript."""
        if not self.websocket or not self._handshake_complete:
            return {"shapes": [], "error": "Bridge not ready"}

        request_id = self._register_request()

        await self._send({
            "type": "snapshot_request",
            "requestId": request_id,
        })

        response = await self._pending[request_id]
        return response.get("snapshot", {})

    async def start(self):
        """Start the WebSocket server."""
        async with websockets.serve(self.handle_client, "localhost", self.port):
            print(f"🌉 Bridge server listening on ws://localhost:{self.port}")
            await asyncio.Future()  # Run forever

    def _register_request(self) -> str:
        """Register a pending request and return its tracking ID."""
        request_id = uuid.uuid4().hex
        self._pending[request_id] = asyncio.get_event_loop().create_future()
        return request_id

    def _enforce_throttle_limits(self):
        loop = asyncio.get_event_loop()
        now = loop.time()
        self._command_timestamps = [ts for ts in self._command_timestamps if now - ts < 1.0]

        if len(self._command_timestamps) >= self._granted_throttle["maxCommandsPerSecond"]:
            raise BridgeThrottleError("maxCommandsPerSecond exceeded")

        if len(self._pending) >= self._granted_throttle["maxOutstandingRequests"]:
            raise BridgeThrottleError("maxOutstandingRequests exceeded")

        self._command_timestamps.append(now)

    def _start_metrics_task(self):
        self._stop_metrics_task()
        loop = asyncio.get_event_loop()
        self._metrics_task = loop.create_task(self._emit_metrics())

    def _stop_metrics_task(self):
        if self._metrics_task and not self._metrics_task.done():
            self._metrics_task.cancel()
        self._metrics_task = None

    async def _emit_metrics(self):
        try:
            while self.websocket and self._handshake_complete:
                payload = {
                    "type": "metrics",
                    "timestamp": int(time.time() * 1000),
                    "commandRate": self._current_command_rate(),
                    "pendingRequests": len(self._pending),
                }
                await self._send(payload)
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            return

    def _current_command_rate(self) -> int:
        loop = asyncio.get_event_loop()
        now = loop.time()
        self._command_timestamps = [ts for ts in self._command_timestamps if now - ts < 1.0]
        return len(self._command_timestamps)

    async def _send(self, payload: Dict[str, Any]):
        if not self.websocket:
            raise ConnectionError("Bridge websocket is not connected")
        await self.websocket.send(json.dumps(payload))


# Global bridge instance
_bridge: WorkspaceBridge | None = None


def get_bridge(port: int = 8765) -> WorkspaceBridge:
    """Get or create the global bridge instance."""
    global _bridge
    if _bridge is None:
        _bridge = WorkspaceBridge(port)
    return _bridge
