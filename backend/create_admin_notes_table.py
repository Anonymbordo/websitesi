from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
from datetime import datetime
import os

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./education_platform.db")

engine = create_engine(DATABASE_URL)

# Create admin notes table
def create_admin_notes_table():
    """Create course_admin_notes table"""
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS course_admin_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                admin_id INTEGER NOT NULL,
                note TEXT NOT NULL,
                note_type VARCHAR DEFAULT 'general',
                is_resolved BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id),
                FOREIGN KEY (admin_id) REFERENCES users(id)
            )
        """))
        conn.commit()
        print("✅ course_admin_notes table created successfully")

if __name__ == "__main__":
    create_admin_notes_table()
