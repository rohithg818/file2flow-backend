import uvicorn
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from server import app
uvicorn.run(app, host="0.0.0.0", port=5000, log_level="debug")
