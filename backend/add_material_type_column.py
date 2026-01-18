"""
Add material_type column to course_materials table
"""
from sqlalchemy import create_engine, text
from database import SQLALCHEMY_DATABASE_URL

def add_material_type_column():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='course_materials' 
                AND column_name='material_type'
            """))
            
            if result.fetchone():
                print("✅ Column 'material_type' already exists in course_materials table")
                return
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE course_materials 
                ADD COLUMN material_type VARCHAR NOT NULL DEFAULT 'video'
            """))
            conn.commit()
            print("✅ Successfully added 'material_type' column to course_materials table")
            
        except Exception as e:
            print(f"❌ Error adding column: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    add_material_type_column()
