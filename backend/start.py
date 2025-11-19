import os
import sys
import uvicorn

if __name__ == "__main__":
    port_str = os.getenv("PORT", "8000")
    print(f"[start.py] PORT env: {port_str}")
    sys.stdout.flush()
    try:
        port = int(port_str)
    except Exception as e:
        print(f"[start.py] Invalid PORT '{port_str}', defaulting to 8000. Error: {e}")
        port = 8000
    print(f"[start.py] Starting Uvicorn on 0.0.0.0:{port}")
    sys.stdout.flush()
    uvicorn.run("main:app", host="0.0.0.0", port=port, log_level="info")
