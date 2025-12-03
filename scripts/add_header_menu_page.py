import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.database import create_all_tables, SessionLocal
from backend.models import Page
from datetime import datetime

def add_header_menu_page():
    db = SessionLocal()
    page = Page(
        slug="hakkimizda",
        title="Hakkımızda",
        blocks_json=[],
        status="published",
        show_in_header=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(page)
    db.commit()
    db.close()

if __name__ == "__main__":
    create_all_tables()
    add_header_menu_page()
    print("Header menüye örnek sayfa eklendi.")
