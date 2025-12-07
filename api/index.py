import sys
import os

# Vercel serverless function için path ayarları
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_dir = os.path.join(parent_dir, 'backend')

# Hem parent hem backend dizinini ekle
sys.path.insert(0, parent_dir)
sys.path.insert(0, backend_dir)

# Backend main dosyasından app'i import et
from backend.main import app

# Vercel için handler
handler = app
