"""
Add categories table to database
"""
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Database setup
DATABASE_URL = "sqlite:///./education_platform.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

Base = declarative_base()

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    type = Column(String, default="course")  # course, blog, general
    color = Column(String, default="#3B82F6")
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def create_categories_table():
    """Create categories table"""
    Base.metadata.create_all(bind=engine, tables=[Category.__table__])
    print("✅ Categories table created successfully!")

def add_default_categories():
    """Add default categories"""
    from sqlalchemy.orm import Session, sessionmaker
    
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    default_categories = [
        {"name": "Programlama", "slug": "programlama", "type": "course", "color": "#3B82F6", "description": "Yazılım geliştirme ve programlama dilleri"},
        {"name": "Web Geliştirme", "slug": "web-gelistirme", "type": "course", "color": "#10B981", "description": "Web teknolojileri ve framework'ler"},
        {"name": "Mobil Geliştirme", "slug": "mobil-gelistirme", "type": "course", "color": "#F59E0B", "description": "iOS ve Android uygulama geliştirme"},
        {"name": "Veri Bilimi", "slug": "veri-bilimi", "type": "course", "color": "#EF4444", "description": "Data Science, Machine Learning, AI"},
        {"name": "Yapay Zeka", "slug": "yapay-zeka", "type": "course", "color": "#8B5CF6", "description": "Artificial Intelligence ve Deep Learning"},
        {"name": "Tasarım", "slug": "tasarim", "type": "course", "color": "#EC4899", "description": "UI/UX, Grafik Tasarım"},
        {"name": "Pazarlama", "slug": "pazarlama", "type": "course", "color": "#06B6D4", "description": "Dijital pazarlama ve sosyal medya"},
        {"name": "İş Geliştirme", "slug": "is-gelistirme", "type": "course", "color": "#84CC16", "description": "Girişimcilik ve iş yönetimi"},
        {"name": "Kişisel Gelişim", "slug": "kisisel-gelisim", "type": "course", "color": "#F97316", "description": "Kişisel beceriler ve gelişim"},
        {"name": "Dil Öğrenimi", "slug": "dil-ogrenimi", "type": "course", "color": "#14B8A6", "description": "Yabancı dil eğitimleri"},
        {"name": "Müzik", "slug": "muzik", "type": "course", "color": "#A855F7", "description": "Müzik teorisi ve enstrüman eğitimleri"},
        {"name": "Fotoğrafçılık", "slug": "fotografcilik", "type": "course", "color": "#F43F5E", "description": "Fotoğraf çekimi ve düzenleme"},
    ]
    
    try:
        for cat_data in default_categories:
            # Check if already exists
            existing = db.query(Category).filter(Category.name == cat_data["name"]).first()
            if not existing:
                category = Category(**cat_data)
                db.add(category)
        
        db.commit()
        print(f"✅ {len(default_categories)} default categories added!")
    except Exception as e:
        print(f"❌ Error adding categories: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Creating categories table...")
    create_categories_table()
    
    print("\nAdding default categories...")
    add_default_categories()
    
    print("\n✨ Migration complete!")
