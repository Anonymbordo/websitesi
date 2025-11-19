import sqlite3
import os

# Backend klasöründeki veritabanını kontrol et
db_path = 'backend/education_platform.db'

if not os.path.exists(db_path):
    print(f"❌ Veritabanı dosyası bulunamadı: {db_path}")
    print("💡 Backend'i en az bir kez çalıştırmanız gerekiyor.")
else:
    print(f"✅ Veritabanı bulundu: {db_path}\n")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Kullanıcıları al
        cursor.execute("SELECT id, email, phone, full_name, password_hash, role, is_active, is_verified, city, created_at FROM users")
        users = cursor.fetchall()
        
        if not users:
            print("❌ Henüz kayıtlı kullanıcı yok.")
        else:
            print(f"📊 Toplam {len(users)} kullanıcı bulundu:\n")
            print("=" * 100)
            
            for user in users:
                user_id, email, phone, full_name, password_hash, role, is_active, is_verified, city, created_at = user
                
                print(f"\n👤 Kullanıcı ID: {user_id}")
                print(f"📧 E-posta: {email}")
                print(f"📱 Telefon: {phone}")
                print(f"👨‍💼 Ad Soyad: {full_name}")
                print(f"🔐 Şifre Hash: {password_hash}")
                print(f"🎭 Rol: {role}")
                print(f"✅ Aktif: {'Evet' if is_active else 'Hayır'}")
                print(f"🔓 Doğrulanmış: {'Evet' if is_verified else 'Hayır'}")
                print(f"📍 Şehir: {city or 'Belirtilmemiş'}")
                print(f"📅 Kayıt Tarihi: {created_at}")
                print("-" * 100)
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ Veritabanı hatası: {e}")
    except Exception as e:
        print(f"❌ Genel hata: {e}")

print("\n⚠️  NOT: Şifreler güvenlik nedeniyle hash'lenmiş (şifrelenmiş) olarak saklanır.")
print("        Hash'lenmiş şifreler geri döndürülemez ve orijinal şifre görüntülenemez.")
