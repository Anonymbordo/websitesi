import sqlite3
import os

# Backend klasöründeki veritabanı
db_path = 'backend/education_platform.db'

if not os.path.exists(db_path):
    print(f"❌ Veritabanı dosyası bulunamadı: {db_path}")
    exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Önce mevcut kullanıcı sayısını kontrol et
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    
    if user_count == 0:
        print("✅ Veritabanında zaten kullanıcı yok.")
    else:
        print(f"⚠️  {user_count} kullanıcı bulundu.")
        
        # Onay iste
        confirmation = input(f"\n🗑️  TÜM KULLANICILAR SİLİNECEK! Emin misiniz? (EVET/hayır): ")
        
        if confirmation.strip().upper() == "EVET":
            # İlişkili tabloları da temizle (foreign key constraints)
            tables_to_clear = [
                'ai_interactions',
                'payments',
                'lesson_progress',
                'enrollments',
                'reviews',
                'instructors',
                'users'
            ]
            
            for table in tables_to_clear:
                try:
                    cursor.execute(f"DELETE FROM {table}")
                    deleted = cursor.rowcount
                    if deleted > 0:
                        print(f"  🗑️  {table}: {deleted} kayıt silindi")
                except sqlite3.OperationalError:
                    # Tablo yoksa geç
                    pass
            
            conn.commit()
            print(f"\n✅ Tüm kullanıcılar ve ilişkili veriler başarıyla silindi!")
        else:
            print("\n❌ İşlem iptal edildi.")
    
    conn.close()
    
except sqlite3.Error as e:
    print(f"❌ Veritabanı hatası: {e}")
except Exception as e:
    print(f"❌ Genel hata: {e}")
