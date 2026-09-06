#!/usr/bin/env python3
"""
File2Flow — Quick Start Script
Starts the Python conversion engine server.
"""

import sys
import subprocess
import os

def main():
    print("=" * 50)
    print("  File2Flow — Python Conversion Engine")
    print("=" * 50)
    print()

    # Check Python version
    if sys.version_info < (3, 8):
        print("ERROR: Python 3.8+ required")
        sys.exit(1)

    # Install dependencies if needed
    try:
        import fastapi
        import uvicorn
        import reportlab
    except ImportError:
        print("Installing dependencies...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

    # Start server
    port = int(os.environ.get("ENGINE_PORT", 5000))
    print(f"Starting engine on port {port}...")
    print(f"Health check: http://localhost:{port}/api/engine/health")
    print()

    import uvicorn
    from server import app
    uvicorn.run(app, host="0.0.0.0", port=port)

if __name__ == "__main__":
    main()
