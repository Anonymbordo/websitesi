import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, Page

# Tabloları oluştur (Eğer yoksa)
Base.metadata.create_all(bind=engine)

def add_missing_pages():
    db = SessionLocal()
    try:
        pages_to_add = [
            {
                "slug": "basinda-biz",
                "title": "Basında Biz",
                "blocks_json": [],
                "status": "published",
                "show_in_header": True
            },
            {
                "slug": "cozum-ortaklari",
                "title": "Çözüm Ortaklarımız",
                "blocks_json": [],
                "status": "published",
                "show_in_header": True
            }
        ]

        for page_data in pages_to_add:
            existing_page = db.query(Page).filter(Page.slug == page_data["slug"]).first()
            if not existing_page:
                print(f"Adding page: {page_data['title']}")
                new_page = Page(**page_data)
                db.add(new_page)
            else:
                print(f"Page already exists: {page_data['title']}")
                # Update if needed
                existing_page.show_in_header = True
                existing_page.status = "published"
        
        db.commit()
        print("✅ Missing pages added successfully.")
    except Exception as e:
        print(f"❌ Error adding pages: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_missing_pages()
