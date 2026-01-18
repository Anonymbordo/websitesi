"""
Add is_featured column to instructors table
"""
from sqlalchemy import text
from database import engine

def add_instructor_featured_column():
    """Instructors tablosuna is_featured kolonu ekle"""
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # Check if column exists
            result = connection.execute(text("PRAGMA table_info(instructors)"))
            existing_columns = [row[1] for row in result]
            
            if 'is_featured' not in existing_columns:
                print("⚠️ Column 'is_featured' missing in instructors table. Adding...")
                connection.execute(text(
                    "ALTER TABLE instructors ADD COLUMN is_featured BOOLEAN DEFAULT FALSE"
                ))
                print("✅ Added 'is_featured' column to instructors table.")
            else:
                print("✅ Column 'is_featured' already exists in instructors table.")
            
            trans.commit()
            print("✅ Migration complete.")
            
        except Exception as e:
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    add_instructor_featured_column()
