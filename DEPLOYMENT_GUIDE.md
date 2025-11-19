# 🚀 Deployment Rehberi - mikrokurs.com

## Genel Bakış
- **Frontend**: Next.js → Vercel (Ücretsiz)
- **Backend**: FastAPI → Railway (Ücretsiz/Ucuz)
- **Database**: PostgreSQL → Railway (Dahil)
- **Domain**: mikrokurs.com → Vercel'e yönlendirilecek

---

## 📋 ÖN HAZIRLIK

### 1. Gerekli Hesaplar
- [ ] GitHub hesabı (repo push için)
- [ ] Vercel hesabı (https://vercel.com) - GitHub ile giriş yap
- [ ] Railway hesabı (https://railway.app) - GitHub ile giriş yap

### 2. Firebase Service Account
Backend'deki `cengizbey-aa7f3-firebase-adminsdk-fbsvc-ac98690986.json` dosyasının içeriğini kopyala.
Railway'de environment variable olarak ekleyeceğiz.

---

## 🔧 ADIM 1: BACKEND RAILWAY DEPLOYMENT

### 1.1 Railway Projesi Oluştur

```bash
# Railway CLI kur (opsiyonel)
npm install -g @railway/cli

# Veya web üzerinden:
# 1. https://railway.app adresine git
# 2. "Start a New Project" tıkla
# 3. "Deploy from GitHub repo" seç
# 4. websitesi/backend klasörünü seç
```

### 1.2 PostgreSQL Ekle
1. Railway dashboard'da "New" → "Database" → "PostgreSQL"
2. Otomatik `DATABASE_URL` oluşturulacak

### 1.3 Environment Variables Ayarla

Railway dashboard'da şu değişkenleri ekle:

```env
# Database (Otomatik gelecek, kontrol et)
DATABASE_URL=postgresql://...

# JWT Secret
SECRET_KEY=your-super-secret-production-jwt-key-min-32-characters

# Firebase (JSON dosyasının içeriğini tek satır string yap)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
# veya
FIREBASE_SERVICE_ACCOUNT_PATH=cengizbey-aa7f3-firebase-adminsdk-fbsvc-ac98690986.json

# Twilio (Opsiyonel - SMS için)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# AI Keys
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GROQ_API_KEY=gsk_...

# Email (Opsiyonel)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Production Settings
DEBUG=False
CORS_ORIGINS=https://mikrokurs.com,https://www.mikrokurs.com

# Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIRECTORY=uploads
```

### 1.4 Deploy
1. Railway otomatik deploy başlatacak
2. Deploy tamamlandığında URL alacaksın: `https://your-backend.railway.app`
3. Bu URL'i not et! ✅

### 1.5 Test Et
```bash
curl https://your-backend.railway.app/docs
```

---

## 🎨 ADIM 2: FRONTEND VERCEL DEPLOYMENT

### 2.1 Environment Variables Hazırla

Frontend'de `.env.local` dosyası oluştur:

```env
# Backend API URL (Railway'den aldığın URL)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Firebase Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 2.2 Vercel Projesi Oluştur

```bash
# Vercel CLI kur (opsiyonel)
npm install -g vercel

# Veya web üzerinden:
# 1. https://vercel.com/new adresine git
# 2. GitHub repo'yu seç (websitesi)
# 3. Root Directory: "frontend" seç
# 4. Framework Preset: "Next.js" otomatik algılanacak
```

### 2.3 Environment Variables Ekle
Vercel dashboard'da:
1. Project Settings → Environment Variables
2. Yukarıdaki `.env.local` değerlerini ekle
3. Production, Preview, Development için hepsini işaretle

### 2.4 Build & Deploy
1. Vercel otomatik build başlatır
2. Deploy tamamlandığında geçici URL: `https://your-project.vercel.app`

---

## 🌐 ADIM 3: DOMAIN AYARLARI (mikrokurs.com)

### 3.1 Vercel'de Domain Ekle
1. Vercel project → Settings → Domains
2. "Add" → `mikrokurs.com` yaz
3. "Add" → `www.mikrokurs.com` yaz
4. Vercel sana nameserver bilgileri verecek

### 3.2 Natro'da DNS Ayarları

**Seçenek A: Nameserver Değiştir (Önerilen)**
1. Natro panel → Alan Adı Yönetimi → mikrokurs.com
2. Nameserver ayarları:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
3. Kaydet → 24-48 saat propagation

**Seçenek B: A Record Ekle (Alternatif)**
1. Natro DNS yönetimi
2. Yeni A Record:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel IP)
   
   Type: A
   Name: www
   Value: 76.76.21.21
   ```

### 3.3 SSL Sertifikası
Vercel otomatik Let's Encrypt SSL kuracak (ücretsiz)

---

## ✅ ADIM 4: TEST & DOĞRULAMA

### Backend Test
```bash
curl https://your-backend.railway.app/api/admin/stats
```

### Frontend Test
```
https://mikrokurs.com
```

### Kontrol Listesi
- [ ] Backend API çalışıyor
- [ ] Frontend yükleniyor
- [ ] Login çalışıyor
- [ ] Database bağlantısı OK
- [ ] API çağrıları başarılı
- [ ] SSL sertifikası aktif (🔒)
- [ ] www.mikrokurs.com → mikrokurs.com redirect

---

## 📊 MALİYET HESABI

### Railway (Backend + DB)
- **Hobby Plan**: $5/ay
- **Starter (Önerilen)**: Free tier ($5 kredi/ay)
- Database dahil, 512MB RAM, otomatik scale

### Vercel (Frontend)
- **Hobby Plan**: ÜCRETSIZ ✅
- Unlimited deployments
- 100GB bandwidth/ay
- Otomatik SSL
- Global CDN

### Natro Hosting
- Domain için kullanılıyor (zaten ödenmiş)
- Hosting kısmını kullanmıyoruz

**TOPLAM**: $0-5/ay (Railway free tier kullanırsan tamamen ücretsiz!)

---

## 🆘 SORUN GİDERME

### Backend 500 Error
- Railway logs kontrol et
- Environment variables eksik olabilir
- Database bağlantısı kontrol et

### Frontend API Error
- `NEXT_PUBLIC_API_URL` doğru mu?
- CORS ayarları backend'de doğru mu?
- Railway backend çalışıyor mu?

### Domain Çalışmıyor
- DNS propagation bekle (24-48 saat)
- `nslookup mikrokurs.com` ile kontrol et
- Vercel'de domain verified olmalı

---

## 📞 DESTEK

Sorun yaşarsan:
1. Railway logs: Dashboard → Deployments → Logs
2. Vercel logs: Dashboard → Deployments → Details → Logs
3. Browser console (F12) → Network tab

---

## 🎯 SONRAKI ADIMLAR

Deployment sonrası:
- [ ] Admin hesabı oluştur
- [ ] Test kullanıcıları ekle
- [ ] Örnek kurslar yükle
- [ ] Production monitoring kur (Railway + Vercel'de dahil)
- [ ] Backup stratejisi belirle
- [ ] Analytics ekle (Google Analytics/Plausible)

---

**Hazırlayan**: Claude AI Assistant
**Tarih**: 19 Kasım 2025
**Domain**: mikrokurs.com
