"""
PRODUCTION DATABASE'E is_featured KOLONU EKLE
"""
from sqlalchemy import create_engine, text, inspect

# Direct database URL - postgresql yerine postgres kullan
database_url = "postgresql://27530559e6b0d7dc0f6846ce1838b1757d5ac55ed39ed1cda0ed6145a205a1f6:sk_mhflooVZLY6oLryG9862N@db.prisma.io:5432/postgres?sslmode=require"

print(f"🗄️  Production database'e bağlanıyorum...")


try:
    engine = create_engine(database_url)
    print("✅ Bağlantı başarılı!")
    
    with engine.connect() as connection:
        # Check if column exists
        inspector = inspect(engine)
        existing_columns = [col['name'] for col in inspector.get_columns('instructors')]
        
        print(f"📋 Mevcut kolonlar: {existing_columns}")
        
        if 'is_featured' not in existing_columns:
            print("⚠️  is_featured kolonu yok, ekleniyor...")
            connection.execute(text(
                "ALTER TABLE instructors ADD COLUMN is_featured BOOLEAN DEFAULT FALSE"
            ))
            connection.commit()
            print("✅✅✅ is_featured kolonu BAŞARIYLA eklendi!")
        else:
            print("✅ is_featured kolonu zaten var!")
            
except Exception as e:
    print(f"❌ HATA: {e}")
    import traceback
    traceback.print_exc()
