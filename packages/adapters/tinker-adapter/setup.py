from setuptools import setup, find_packages

setup(
    name="tinker-workspace-adapter",
    version="0.1.0",
    description="Tinker adapter for Workspace RL training",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "tinker>=0.1.0",
        "pandas>=2.0.0",
        "numpy>=1.24.0",
        "python-dotenv>=1.0.0",
        "aiohttp>=3.9.0",
        "websockets>=12.0",
    ],
)
