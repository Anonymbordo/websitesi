# 🚀 HIZLI DEPLOYMENT BAŞLANGIÇ

## ÖNEMLİ: Sırayla yapın!

### 1️⃣ GitHub'a Push (Henüz yapılmadıysa)

```bash
# Workspace root'ta
git add .
git commit -m "Production deployment hazırlığı"
git push origin main
```

### 2️⃣ Railway Backend Deployment

1. **Railway'e Git**: https://railway.app
2. **New Project** → **Deploy from GitHub repo**
3. **websitesi** repo'sunu seç
4. **Add PostgreSQL Database** (New → Database → PostgreSQL)
5. **Environment Variables Ekle**:
   - `backend/.env.railway.template` dosyasını aç
   - Değerleri Railway'e yapıştır
   - **ÖNEMLİ**: `FIREBASE_SERVICE_ACCOUNT` için:
     ```bash
     # backend klasöründe:
     cat cengizbey-aa7f3-firebase-adminsdk-fbsvc-ac98690986.json | jq -c
     # Çıkan tek satır JSON'u Railway'e yapıştır
     ```
6. **Deploy** → URL'i kopyala (örn: `https://web-production-abc123.railway.app`)

### 3️⃣ Vercel Frontend Deployment

1. **Vercel'e Git**: https://vercel.com/new
2. **Import Git Repository** → **websitesi** seç
3. **Configure Project**:
   - **Root Directory**: `frontend` seç ✅
   - **Framework Preset**: Next.js (otomatik)
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://web-production-abc123.railway.app
   (Railway'den aldığın backend URL'i)
   ```
5. **Deploy** → Bekle (~2-3 dakika)

### 4️⃣ Domain Bağlama (mikrokurs.com)

1. **Vercel'de**:
   - Project → Settings → Domains
   - Add: `mikrokurs.com` ✅
   - Add: `www.mikrokurs.com` ✅
   
2. **Natro'da** (DNS Ayarları):
   - Nameserver değiştir:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```
   - Veya A Record ekle:
     ```
     @ → 76.76.21.21
     www → 76.76.21.21
     ```

### 5️⃣ CORS Güncelle

Railway'de backend environment variables:
```
CORS_ORIGINS=https://mikrokurs.com,https://www.mikrokurs.com
```

Railway otomatik redeploy yapacak.

---

## ✅ TEST

1. Backend: `https://your-backend.railway.app/docs`
2. Frontend: `https://mikrokurs.com`
3. Login test et
4. Admin panel test et

---

## 🆘 Sorun mu var?

### Backend çalışmıyor
```bash
# Railway logs kontrol et:
# Dashboard → Backend service → Deployments → View Logs
```

### Frontend API'ye ulaşamıyor
- Vercel env variables doğru mu? (NEXT_PUBLIC_API_URL)
- Railway backend CORS_ORIGINS doğru mu?
- Her iki deploy da tamamlandı mı?

### Domain çalışmıyor
- DNS propagation bekle (24-48 saat)
- `nslookup mikrokurs.com` test et
- Vercel'de domain "verified" mi?

---

**Süre**: Toplam ~30 dakika
**Maliyet**: $0-5/ay
**SSL**: Otomatik (Vercel + Railway)

Başarılar! 🎉
