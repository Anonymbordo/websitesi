import sqlite3

conn = sqlite3.connect('education_platform.db')
cursor = conn.cursor()

# Sadece sayıları göster
cursor.execute("SELECT COUNT(*) FROM users WHERE role != 'admin'")
non_admin_count = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin'")
admin_count = cursor.fetchone()[0]

print(f"👤 Admin: {admin_count}")
print(f"👥 Diğer kullanıcılar: {non_admin_count}")
print(f"\nToplam silinecek: {non_admin_count} kullanıcı")

if non_admin_count > 0:
    # Sil
    cursor.execute("DELETE FROM enrollments WHERE student_id IN (SELECT id FROM users WHERE role != 'admin')")
    cursor.execute("DELETE FROM instructors WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')")
    cursor.execute("DELETE FROM reviews WHERE user_id IN (SELECT id FROM users WHERE role != 'admin')")
    cursor.execute("DELETE FROM otp_verifications")
    cursor.execute("DELETE FROM users WHERE role != 'admin'")
    conn.commit()
    print(f"✅ {non_admin_count} kullanıcı silindi!")
else:
    print("✅ Zaten sadece admin var!")

conn.close()
