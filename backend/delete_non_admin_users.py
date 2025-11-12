import sqlite3

conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# Önce mevcut kullanıcıları göster
cursor.execute("SELECT id, email, full_name, role FROM users")
users = cursor.fetchall()

print("📋 MEVCUT KULLANICILAR:")
print("="*80)
for user in users:
    print(f"ID: {user[0]} | {user[2]} | {user[1]} | Rol: {user[3]}")

# Admin olmayan kullanıcıları sil
cursor.execute("SELECT id, email, full_name FROM users WHERE role != 'admin'")
to_delete = cursor.fetchall()

if not to_delete:
    print("\n✅ Admin olmayan kullanıcı yok!")
else:
    print(f"\n🗑️  SİLİNECEK KULLANICILAR: {len(to_delete)}")
    for user in to_delete:
        print(f"  - {user[2]} ({user[1]})")
    
    # Önce ilişkili kayıtları sil
    print("\n🔄 İlişkili kayıtlar siliniyor...")
    
    # Enrollments
    cursor.execute("DELETE FROM enrollments WHERE student_id IN (SELECT id FROM users WHERE role != 'admin')")
    print(f"  ✅ {cursor.rowcount} enrollment silindi")
    
    # Instructors
    cursor.execute("DELETE FROM instructors WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')")
    print(f"  ✅ {cursor.rowcount} instructor silindi")
    
    # Reviews
    cursor.execute("DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')")
    print(f"  ✅ {cursor.rowcount} review silindi")
    
    # OTP records
    cursor.execute("DELETE FROM otp_verifications")
    print(f"  ✅ Tüm OTP kayıtları temizlendi")
    
    # Kullanıcıları sil
    cursor.execute("DELETE FROM users WHERE role != 'admin'")
    print(f"  ✅ {cursor.rowcount} kullanıcı silindi")

conn.commit()

# Sonuç
print("\n" + "="*80)
print("📊 GÜNCEL DURUM:")
print("="*80)

cursor.execute("SELECT id, email, full_name, role FROM users")
remaining = cursor.fetchall()

print(f"Kalan kullanıcı sayısı: {len(remaining)}\n")
for user in remaining:
    print(f"✅ ID: {user[0]} | {user[2]} | {user[1]} | Rol: {user[3]}")

cursor.execute("SELECT COUNT(*) FROM enrollments")
print(f"\nKalan enrollment: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM instructors")
print(f"Kalan instructor: {cursor.fetchone()[0]}")

print("\n✅ Temizlik tamamlandı!")
print("\n🔑 Admin Giriş:")
print("  Email: ddemurathan12@gmail.com")
print("  Şifre: 8338kelebek")

conn.close()
