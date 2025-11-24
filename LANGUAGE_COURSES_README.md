# Yabancı Dil Kursları Yönetim Sistemi

Admin paneli üzerinden yabancı dil kurslarını (İngilizce, Almanca, Fransızca, İspanyolca) A1-C2 seviyelerinde yönetebilirsiniz.

## Özellikler

### 1. Kurs Yönetimi
- 4 Dil: İngilizce 🇬🇧, Almanca 🇩🇪, Fransızca 🇫🇷, İspanyolca 🇪🇸
- 6 Seviye: A1, A2, B1, B2, C1, C2 (CEFR standartları)
- Kurs bilgileri (başlık, açıklama, fiyat)
- Aktif/Pasif durumu

### 2. İçerik Yönetimi

#### Ders Konuları (Topics)
- Konu başlığı ve detaylı açıklama
- Metin içeriği (örnekler, açıklamalar)
- Sıralama ve süre bilgisi
- Ücretsiz önizleme seçeneği

#### Ders Notları (Notes)
- PDF dosya yükleme
- İndirilebilir seçeneği
- Dosya başlığı ve açıklama

#### Ders Videoları (Videos)
- Video URL'i
- Thumbnail resmi
- Video süresi
- Ücretsiz önizleme

#### Online Sınavlar (Exams)
- Sınav oluşturma
- Çoktan seçmeli sorular
- Geçme notu belirleme
- Süre limiti

#### Eğitmenler (Instructors)
- Native speaker eğitmenler
- Biyografi ve fotoğraf
- Uzmanlık alanları
- Deneyim yılı ve puan

#### Canlı Ders Talepleri (Live Class Requests)
- Öğrenci talepleri görüntüleme
- Birebir/Grup ders
- Talep onaylama/reddetme
- Toplantı linki oluşturma

## Admin Paneli Kullanımı

### Kurslara Erişim
1. Admin paneline giriş yapın: `/admin`
2. "Yabancı Dil Kursları" kartına tıklayın
3. veya doğrudan: `/admin/language-courses`

### Kurs Oluşturma
1. "Yeni Kurs Ekle" butonuna tıklayın
2. Dil ve seviye seçin
3. Başlık ve açıklama girin
4. Fiyat belirleyin (₺299 varsayılan)
5. "Oluştur" butonuna tıklayın

### İçerik Ekleme
Her kurs kartında 6 içerik yönetim butonu vardır:

1. **Konular** - Ders konularını ekleyin/düzenleyin
2. **Notlar** - PDF notları yükleyin
3. **Videolar** - Video URL'lerini ekleyin
4. **Sınavlar** - Testler ve sorular oluşturun
5. **Eğitmenler** - Eğitmen profillerini ekleyin
6. **Canlı Ders** - Talepleri yönetin

## API Endpoint'leri

### Kurslar
- `GET /api/language-courses/courses` - Tüm kursları listele
- `GET /api/language-courses/courses/{id}` - Kurs detayı
- `POST /api/language-courses/courses` - Yeni kurs (Admin)
- `PUT /api/language-courses/courses/{id}` - Kurs güncelle (Admin)
- `DELETE /api/language-courses/courses/{id}` - Kurs sil (Admin)

### Konular
- `POST /api/language-courses/courses/{id}/topics` - Konu ekle
- `PUT /api/language-courses/topics/{id}` - Konu güncelle
- `DELETE /api/language-courses/topics/{id}` - Konu sil

### Notlar
- `POST /api/language-courses/courses/{id}/notes` - Not ekle
- `PUT /api/language-courses/notes/{id}` - Not güncelle
- `DELETE /api/language-courses/notes/{id}` - Not sil

### Videolar
- `POST /api/language-courses/courses/{id}/videos` - Video ekle
- `PUT /api/language-courses/videos/{id}` - Video güncelle
- `DELETE /api/language-courses/videos/{id}` - Video sil

### Sınavlar
- `POST /api/language-courses/courses/{id}/exams` - Sınav oluştur
- `POST /api/language-courses/exams/{id}/questions` - Soru ekle
- `GET /api/language-courses/exams/{id}/questions` - Soruları getir

### Eğitmenler
- `POST /api/language-courses/courses/{id}/instructors` - Eğitmen ekle
- `PUT /api/language-courses/instructors/{id}` - Eğitmen güncelle
- `DELETE /api/language-courses/instructors/{id}` - Eğitmen sil

### Canlı Ders
- `POST /api/language-courses/live-class-requests` - Talep oluştur (Öğrenci)
- `GET /api/language-courses/live-class-requests` - Tüm talepler (Admin)
- `PUT /api/language-courses/live-class-requests/{id}` - Talep güncelle (Admin)

### Erişim Kontrolü
- `GET /api/language-courses/check-access/{language}/{level}` - Kullanıcı erişimini kontrol et

## Database Tabloları

1. **language_courses** - Ana kurs bilgileri
2. **language_course_topics** - Ders konuları
3. **language_course_notes** - PDF notlar
4. **language_course_videos** - Video içerikler
5. **language_course_exams** - Sınavlar
6. **language_exam_questions** - Sınav soruları
7. **language_course_instructors** - Eğitmenler
8. **language_course_purchases** - Satın almalar
9. **live_class_requests** - Canlı ders talepleri

## Kurulum

### Backend
```bash
cd backend

# Tabloları oluştur
python create_language_tables.py

# Başlangıç verilerini ekle (24 kurs)
python seed_language_courses.py
```

### Frontend
Admin paneli zaten yapılandırılmış, sadece giriş yapın:
```
http://localhost:3000/admin/language-courses
```

## Kullanıcı Tarafı

Kullanıcılar şu sayfalardan kurslara erişebilir:
- `/courses/yabanci-dil` - Dil seçimi
- `/courses/yabanci-dil/ingilizce` - İngilizce seviyeleri
- `/courses/yabanci-dil/ingilizce/a1` - A1 seviye detayı

Her seviye sayfasında:
- ₺299 ödeme sistemi
- 6 içerik bölümü (kilit sistemli)
- Satın aldıktan sonra tüm içeriklere erişim
- Canlı ders talebi formu

## Güvenlik

- Tüm admin endpoint'leri `require_role(["admin"])` ile korunmuş
- Kullanıcılar sadece satın aldıkları kurslara erişebilir
- Dosya yüklemeleri token kontrolü ile
- CORS ayarları yapılandırılmış

## Sonraki Adımlar

1. Video yükleme sistemi (Vimeo/YouTube entegrasyonu)
2. Sınav otomasyonu (puan hesaplama, sertifika)
3. Progress tracking (ilerleme takibi)
4. Bildirim sistemi (yeni içerik, canlı ders onayı)
5. Analytics (en çok satılan kurslar, tamamlanma oranları)

## Destek

Sorunlar için backend loglarına bakın:
```bash
cd backend
python main.py  # veya uvicorn main:app --reload
```

Frontend için:
```bash
cd frontend
npm run dev
```
