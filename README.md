# Website Projesi

Bu proje ekip olarak geliştirdiğimiz web sitesi projesidir.

## Kurulum

1. Projeyi klonlayın
2. Gerekli bağımlılıkları yükleyin
3. Projeyi çalıştırın

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik eklendi'`)
4. Branch'i push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altındadır.

## Ortam Değişkenleri (env)

Gizli anahtarları doğrudan repoya commit etmeyin. Örnek env dosyaları eklendi:

- `frontend/.env.example` → client-side (Next.js) için `NEXT_PUBLIC_` ile başlayan değişkenler
- `backend/.env.example` → backend için TWILIO, MAILGUN, GMAIL, SECRET_KEY gibi değişkenler

Kullanım: ilgili örnek dosyayı kopyalayıp gerçek değerlerle doldurun:

```bash
# frontend
cp frontend/.env.example frontend/.env.local

# backend
cp backend/.env.example backend/.env
```

Sonra ilgili sunucuyu yeniden başlatın (Next.js veya uvicorn).