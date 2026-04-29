from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple
from uuid import uuid4

import tinker
from tinker_cookbook.rl.types import (
    Action,
    Env,
    EnvGroupBuilder,
    Observation,
    RLDataset,
    StepResult,
    StopCondition,
)

from src.action_parser import parse_action
from src.bridge import get_bridge
from src.reward_functions import calculate_reward

MANIFEST_FILENAME = "manifest.json"
EXPECTED_MANIFEST_VERSIONS = {
    "tdc_version": "1.0.0",
    "workspace_contract_version": "1.0.0",
    "reward_version": "1.0",
    "bridge_version": "1.0",
}


@dataclass
class WorkspaceSample:
    session_id: str
    prompt: str
    prompt_thread: List[Dict[str, Any]]
    initial_snapshot: Dict[str, Any]
    final_snapshot: Dict[str, Any]
    contract: Dict[str, Any] | None
    difficulty: str


class WorkspaceEnv(Env):
    """Tinker-compatible wrapper for workspace operations."""

    def __init__(self, sample: WorkspaceSample):
        self.sample = sample
        self.prompt = sample.prompt
        self.step_count = 0
        self.max_steps = 10
        self.bridge = get_bridge()

    async def initial_observation(self) -> Tuple[Observation, StopCondition]:
        self.step_count = 0
        await self.bridge.get_snapshot()
        return tinker.ModelInput.empty(), []

    async def step(self, action: Action) -> StepResult:
        self.step_count += 1

        action_text = action.text if hasattr(action, 'text') else str(action)
        command = parse_action(action_text)

        if command:
            await self.bridge.execute_command(command)

        snapshot = await self.bridge.get_snapshot()

        reward = calculate_reward(self.prompt, snapshot)
        done = self.step_count >= self.max_steps

        return StepResult(
            reward=reward,
            episode_done=done,
            next_observation=tinker.ModelInput.empty(),
            next_stop_condition=[],
            metrics={"snapshot": str(snapshot)},
        )


class WorkspaceEnvGroupBuilder(EnvGroupBuilder):
    def __init__(self, samples: Sequence[WorkspaceSample]):
        self.samples = samples

    async def make_envs(self) -> Sequence[Env]:
        return [WorkspaceEnv(sample) for sample in self.samples]


class WorkspaceRLDataset(RLDataset):
    def __init__(self, data_path: str):
        self.manifest: Optional[Dict[str, Any]] = None
        self.samples = self._load_samples(data_path)
        if not self.samples:
            print(f"⚠️  Dataset file not found or empty: {data_path}, using default prompt")
            self.samples = [
                WorkspaceSample(
                    session_id="fallback",
                    prompt="create a circle",
                    prompt_thread=[],
                    initial_snapshot={},
                    final_snapshot={},
                    contract=None,
                    difficulty="level-1",
                )
            ]

    def _load_samples(self, data_path: str) -> List[WorkspaceSample]:
        path = Path(data_path)
        if path.is_dir():
            return self._load_samples_from_directory(path)

        if not path.exists():
            return []

        raw = path.read_text()
        records = self._parse_records(raw)
        return self._records_to_samples(records)

    def _load_samples_from_directory(self, directory: Path) -> List[WorkspaceSample]:
        manifest = self._load_manifest(directory)
        files = manifest.get("files", [])
        if not isinstance(files, list):
            raise ValueError("Manifest files entry must be a list.")

        samples: List[WorkspaceSample] = []
        for entry in files:
            if not isinstance(entry, dict):
                raise ValueError("Manifest file entries must be objects.")
            relative_path = entry.get("path")
            if not isinstance(relative_path, str):
                raise ValueError("Manifest file entry missing path string.")
            file_path = directory / relative_path
            if not file_path.exists():
                raise FileNotFoundError(f"Dataset file listed in manifest is missing: {file_path}")

            buffer = file_path.read_bytes()
            expected_hash = entry.get("hash")
            if expected_hash:
                actual_hash = self._compute_sha256_base64(buffer)
                if expected_hash != actual_hash:
                    raise ValueError(
                        f"Hash mismatch for {relative_path}: expected {expected_hash}, got {actual_hash}"
                    )

            records = self._parse_records(buffer.decode("utf-8"))
            samples.extend(self._records_to_samples(records))

        expected_count = manifest.get("count")
        if isinstance(expected_count, int) and expected_count != len(samples):
            raise ValueError(f"Manifest count ({expected_count}) does not match parsed samples ({len(samples)}).")

        self.manifest = manifest
        return samples

    def _parse_records(self, raw: str) -> List[Dict[str, Any]]:
        content = raw.strip()
        if not content:
            return []

        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict) and "prompts" in parsed:
                return [{"prompt": prompt} for prompt in parsed["prompts"]]
            if isinstance(parsed, dict) and "sessions" in parsed:
                return list(parsed["sessions"])
            if isinstance(parsed, list):
                return list(parsed)
            return [parsed]
        except json.JSONDecodeError:
            records: List[Dict[str, Any]] = []
            for line in content.splitlines():
                line = line.strip()
                if not line:
                    continue
                records.append(json.loads(line))
            return records

    def _records_to_samples(self, records: List[Dict[str, Any]]) -> List[WorkspaceSample]:
        samples: List[WorkspaceSample] = []
        for record in records:
            if not isinstance(record, dict):
                continue
            contract = record.get("contract")
            if not contract and isinstance(record.get("prompt_thread"), list):
                contract = record

            prompt_thread = (contract or {}).get("prompt_thread", [])
            prompt = record.get("prompt")
            if not prompt and prompt_thread:
                prompt = next(
                    (turn.get("text", "") for turn in prompt_thread if turn.get("speaker") == "user"),
                    "",
                )
            prompt = prompt or "design a simple room"

            session_id = (
                (contract or {}).get("session_id")
                or record.get("session_id")
                or record.get("id")
                or f"sample-{uuid4().hex}"
            )

            initial_snapshot = (contract or {}).get("initial_snapshot") or record.get("initial_snapshot") or {}
            final_snapshot = (
                (contract or {}).get("final_snapshot")
                or record.get("final_snapshot")
                or record.get("targetSnapshot")
                or {}
            )

            difficulty = record.get("difficulty") or (contract or {}).get("difficulty") or "level-1"

            samples.append(
                WorkspaceSample(
                    session_id=session_id,
                    prompt=prompt,
                    prompt_thread=prompt_thread,
                    initial_snapshot=initial_snapshot,
                    final_snapshot=final_snapshot,
                    contract=contract,
                    difficulty=difficulty,
                )
            )
        return samples

    def _load_manifest(self, directory: Path) -> Dict[str, Any]:
        manifest_path = directory / MANIFEST_FILENAME
        if not manifest_path.exists():
            raise FileNotFoundError(f"Dataset directory missing {MANIFEST_FILENAME}: {directory}")

        manifest = json.loads(manifest_path.read_text())
        for key, expected_value in EXPECTED_MANIFEST_VERSIONS.items():
            actual = manifest.get(key)
            if actual != expected_value:
                raise ValueError(f"Manifest {key} expected {expected_value}, got {actual}")
        if "files" not in manifest:
            raise ValueError("Manifest must include a files array.")
        return manifest

    def _compute_sha256_base64(self, payload: bytes) -> str:
        digest = hashlib.sha256(payload).digest()
        encoded = base64.b64encode(digest).decode("utf-8")
        return f"sha256-{encoded}"

    def get_batch(self, index: int) -> list[EnvGroupBuilder]:
        return [WorkspaceEnvGroupBuilder(self.samples)]

    def __len__(self) -> int:
        return len(self.samples)
