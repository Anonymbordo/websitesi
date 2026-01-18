"""
Add is_featured column to instructors table in PRODUCTION
"""
import os
from sqlalchemy import create_engine, text, inspect

def add_instructor_featured_column():
    """Production instructors tablosuna is_featured kolonu ekle"""
    
    # Use production database URL from environment
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("❌ DATABASE_URL environment variable not found!")
        return False
    
    print(f"🗄️  Using production PostgreSQL database")
    
    try:
        engine = create_engine(database_url)
        print("✅ Database engine created successfully")
        
        with engine.connect() as connection:
            # Check if column already exists
            inspector = inspect(engine)
            existing_columns = [col['name'] for col in inspector.get_columns('instructors')]
            
            if 'is_featured' not in existing_columns:
                print("⚠️ Column 'is_featured' missing in instructors table. Adding...")
                connection.execute(text(
                    "ALTER TABLE instructors ADD COLUMN is_featured BOOLEAN DEFAULT FALSE"
                ))
                connection.commit()
                print("✅ Added 'is_featured' column to instructors table.")
            else:
                print("✅ Column 'is_featured' already exists in instructors table.")
        
        print("✅ Migration complete.")
        return True
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    add_instructor_featured_column()
