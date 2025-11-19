from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.models import Category
from backend.database import DATABASE_URL

print('Using DB:', DATABASE_URL)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if 'sqlite' in DATABASE_URL else {})
Session = sessionmaker(bind=engine)
db = Session()
try:
    cats = db.query(Category).all()
    if not cats:
        print('No categories in DB')
    else:
        for c in cats:
            print(f'id={c.id} name="{c.name}" slug="{c.slug}" type={c.type} is_active={c.is_active} parent={c.parent_id}')
finally:
    db.close()
