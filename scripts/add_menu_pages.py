from backend.database import create_all_tables, SessionLocal
from backend.models import Page
from datetime import datetime

def add_header_menu_page(slug, title):
    db = SessionLocal()
    page = Page(
        slug=slug,
        title=title,
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
    add_header_menu_page("basinda-biz", "BASINDA BİZ")
    add_header_menu_page("cozum-ortaklari", "ÇÖZÜM ORTAKLARIMIZ")
    print("Menüye BASINDA BİZ ve ÇÖZÜM ORTAKLARIMIZ eklendi.")
