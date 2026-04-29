# Tinker Adapter

Python adapter for training Workspace RL agents using Tinker's cloud platform.

## Setup

1. **Create virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -e .
```

3. **Configure Tinker API:**
```bash
cp .env.example .env
# Edit .env and add your TINKER_API_KEY
```

4. **Verify installation:**
```bash
python scripts/verify_setup.py
```

## Training

Run basic training:
```bash
python scripts/train_basic.py
```

## Project Structure

```
packages/adapters/tinker-adapter/
├── src/
│   ├── workspace_env.py      # Tinker Env wrapper
│   ├── reward_functions.py   # Reward calculations
│   ├── action_parser.py      # Token → Command mapping
│   └── data_loader.py        # Training datasets
├── scripts/
│   ├── train_basic.py        # Minimal training loop
│   ├── evaluate.py           # Model evaluation
│   └── verify_setup.py       # Setup verification
└── data/
    └── training-prompts.jsonl
```

`data/training-prompts.jsonl` contains contract-compliant training sessions exported from the Maya workspace (`tdc_version: 1.0.0`). Each JSON or JSONL entry encodes the prompt thread, snapshots, executed commands, and annotations so the adapter can faithfully replay and score trajectories.
