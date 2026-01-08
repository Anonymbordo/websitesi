# Vercel Serverless Function Handler
import sys
import os

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
sys.path.insert(0, backend_path)

# Set environment to production for Vercel
os.environ.setdefault('VERCEL', '1')

try:
    # Import FastAPI app
    from main import app
    
    # Vercel will use this handler
    handler = app
    
    print("✅ Vercel handler initialized successfully")
except Exception as e:
    print(f"❌ Failed to initialize Vercel handler: {e}")
    import traceback
    traceback.print_exc()
    raise
