# Firebase + Database Entegrasyonlu Kullanıcı Yönetimi

Bu klasörde Firebase Authentication ve veritabanı entegrasyonlu kullanıcı yönetim scriptleri bulunur.

## 📋 Kurulum

### 1. Firebase Admin SDK Kurulumu

```bash
pip install firebase-admin
```

### 2. Firebase Service Account Yapılandırması

Firebase Console'dan service account key dosyası indirin:
1. Firebase Console → Project Settings → Service Accounts
2. "Generate New Private Key" butonuna tıklayın
3. İndirilen JSON dosyasını güvenli bir yere kaydedin

### 3. Environment Variables

`.env` dosyanıza aşağıdaki değişkenlerden birini ekleyin:

**Seçenek 1: JSON dosya yolu**
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
```

**Seçenek 2: JSON içeriği (Railway, Heroku gibi platformlar için)**
```env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"..."}'
```

## 🔧 Kullanım

### Kullanıcıları Listeleme

Hem veritabanındaki hem de Firebase'deki tüm kullanıcıları listeler:

```bash
python list_users_firebase.py
```

**Çıktı:**
- 📊 Veritabanı kullanıcıları (e-posta, telefon, rol, vb.)
- 🔥 Firebase kullanıcıları (UID, email, doğrulama durumu)
- 🔄 Karşılaştırma (hangi kullanıcılar nerede var)

### Tüm Kullanıcıları Silme

⚠️ **UYARI: Bu işlem geri alınamaz!**

Hem Firebase'den hem de veritabanından tüm kullanıcıları siler:

```bash
python delete_users_firebase.py
```

**Silinecek veriler:**
- ✅ Firebase Authentication kullanıcıları
- ✅ Veritabanı kullanıcıları
- ✅ Eğitmen profilleri
- ✅ Kurs kayıtları
- ✅ Ders ilerlemeleri
- ✅ Yorumlar ve değerlendirmeler
- ✅ Ödemeler
- ✅ OTP doğrulama kayıtları
- ✅ AI etkileşim geçmişi

**Güvenlik Önlemleri:**
- İki aşamalı onay gerektirir
- "EVET" ve "SIL" yazmanız gerekir
- İşlem öncesi mevcut kullanıcı sayısını gösterir

### Basit Veritabanı Kontrolü

Firebase olmadan sadece veritabanını kontrol etmek için:

```bash
python check_users.py
```

## 🔐 Güvenlik Notları

1. **Şifre Güvenliği:**
   - Veritabanındaki şifreler bcrypt ile hash'lenmiştir
   - Hash'lenmiş şifreler geri döndürülemez
   - Firebase şifreleri Firebase tarafından yönetilir

2. **Service Account Güvenliği:**
   - Service account key dosyasını asla git'e eklemeyin
   - `.gitignore` dosyasına ekleyin: `*serviceAccountKey.json`
   - Production'da environment variable kullanın

3. **Veri Silme:**
   - Silme işlemi tüm ilişkili verileri de siler
   - Backup almadan silme yapmayın
   - Test ortamında önce deneyin

## 📊 Kullanıcı Doğrulama Akışı

### Kayıt (Register)

1. **OTP Gönderimi:**
   ```
   POST /api/auth/send-otp
   { "phone": "+905551234567" }
   ```

2. **OTP Doğrulama:**
   ```
   POST /api/auth/verify-otp
   { "phone": "+905551234567", "otp_code": "123456" }
   ```

3. **Kullanıcı Kaydı:**
   ```
   POST /api/auth/register
   {
     "email": "user@example.com",
     "phone": "+905551234567",
     "password": "securePassword123",
     "full_name": "Ahmet Yılmaz",
     "city": "İstanbul",
     "district": "Kadıköy"
   }
   ```

### Firebase ile Kayıt/Giriş

1. **Firebase Registration:**
   ```
   POST /api/auth/register-firebase
   {
     "id_token": "firebase_id_token",
     "full_name": "Ahmet Yılmaz",
     "phone": "+905551234567"
   }
   ```

2. **Firebase Login:**
   ```
   POST /api/auth/login-firebase
   {
     "id_token": "firebase_id_token"
   }
   ```

## 🚀 Frontend Entegrasyonu

Frontend'de Firebase kullanımı için `frontend/src/lib/firebase.ts`:

```typescript
import { firebaseCreateUser, firebaseSendVerification, firebaseSignIn } from '@/lib/firebase'

// Kayıt
const userCredential = await firebaseCreateUser(email, password)
await firebaseSendVerification(userCredential.user)

// Giriş
const userCredential = await firebaseSignIn(email, password)
const idToken = await userCredential.user.getIdToken()

// Backend'e token gönder
const response = await fetch('/api/auth/login-firebase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id_token: idToken })
})
```

## 🛠️ Sorun Giderme

### Firebase Admin SDK Hatası

```
❌ Firebase Admin SDK yüklü değil
```

**Çözüm:**
```bash
pip install firebase-admin
```

### Firebase Yapılandırma Hatası

```
⚠️ Firebase yapılandırması bulunamadı
```

**Çözüm:**
1. `.env` dosyasını kontrol edin
2. `FIREBASE_SERVICE_ACCOUNT` veya `FIREBASE_SERVICE_ACCOUNT_PATH` ekleyin
3. Service account JSON'ın geçerli olduğundan emin olun

### Veritabanı Bağlantı Hatası

```
❌ Veritabanı hatası
```

**Çözüm:**
1. Backend'i en az bir kez çalıştırın: `cd backend && python main.py`
2. Veritabanı dosyasının oluştuğunu kontrol edin: `backend/education_platform.db`

## 📝 Örnek .env Dosyası

```env
# Database
DATABASE_URL=sqlite:///./education_platform.db

# JWT
SECRET_KEY=your-secret-key-here

# Twilio (OTP için)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
DEFAULT_COUNTRY_CODE=+90

# Firebase (Backend - Admin SDK)
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
# VEYA
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Firebase (Frontend - Web Config)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ABC123

# Mailgun (E-posta için)
MAILGUN_DOMAIN=your-domain.mailgun.org
MAILGUN_API_KEY=your_mailgun_api_key

# AI (Chatbot için)
GROQ_API_KEY=your_groq_api_key
```

## 📚 İlgili Dosyalar

- `backend/auth.py` - Authentication endpoint'leri
- `backend/models.py` - Database modelleri
- `frontend/src/lib/firebase.ts` - Firebase client konfigürasyonu
- `frontend/src/app/auth/` - Frontend auth sayfaları
