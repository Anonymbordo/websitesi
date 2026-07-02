# Payment Service Deployment

Bu servis QNB 3D Host ilk POST istegini uygulama sunucusundan baslatmak icin ayrildi.

## Amac

- Frontend ve ana backend mevcut alan adinda kalir.
- QNB odeme baslatma ve callback akisi ayri payment service uzerinden calisir.
- `NEXT_PUBLIC_PAYMENT_API_URL` frontend env'i ayri service domainine isaret eder.
- `PAYMENT_PUBLIC_BASE_URL` env'i create-payment cevabindaki checkout URL tabanini belirler.

## Onerilen Alan Adi

- `https://pay.mikrokurs.com`

## Gerekli Env'ler

- Tum mevcut veritabani ve auth env'leri
- `PAYMENT_BASE_URL=https://pay.mikrokurs.com`
- `PAYMENT_PUBLIC_BASE_URL=https://pay.mikrokurs.com`
- `QNB_START_MODE=proxy`

## Vercel Ayrik Deploy

Repo kokunden:

```bash
npx vercel --prod --local-config payment-service.vercel.json
```

Sonrasinda frontend/ana backend tarafinda:

- `NEXT_PUBLIC_PAYMENT_API_URL=https://pay.mikrokurs.com`
- Gerekirse ana backend'de de `PAYMENT_PUBLIC_BASE_URL=https://pay.mikrokurs.com`

## Not

Bu degisiklik QNB'ye giden ilk POST'u browser yerine backend uzerinden baslatir. Bankaya tanimlanacak IP, artik payment service'in cikis IP'si olmalidir.
