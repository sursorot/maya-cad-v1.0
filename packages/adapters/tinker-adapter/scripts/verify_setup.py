#!/usr/bin/env python3
"""
Verify Tinker setup and API connectivity.
"""

import os
import sys
from dotenv import load_dotenv

def main():
    print("🔧 Verifying Tinker setup...")
    
    # Check Python version
    if sys.version_info < (3, 9):
        print("❌ Python 3.9+ required")
        return False
    print("✅ Python version:", sys.version.split()[0])
    
    # Check .env file
    # Try loading from current dir, then parent dir
    if os.path.exists(".env"):
        load_dotenv(".env")
    elif os.path.exists("../.env"):
        load_dotenv("../.env")
        print("✅ Found .env in parent directory")
    
    api_key = os.getenv("TINKER_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        print("❌ TINKER_API_KEY not set in .env file")
        print("   Please ensure TINKER_API_KEY is set in .env (inside packages/adapters/tinker-adapter/ or repo root)")
        return False
    print("✅ API key found")
    
    # Check Tinker SDK
    try:
        import tinker
        print("✅ Tinker SDK installed")
    except ImportError:
        print("❌ Tinker SDK not installed")
        print("   Run: pip install -e .")
        return False
    
    # Try connecting to Tinker
    try:
        print("\n🔌 Testing Tinker connection...")
        service_client = tinker.ServiceClient()
        print("✅ Connected to Tinker!")
        return True
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
        print("   Check your API key and network connection")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
