# AWS Lightsail Payment Service

Bu rehber, QNB odeme baslatma akisinin sabit IP'li ayri bir AWS Lightsail sunucusundan calismasi icindir.

## Neden

- Banka whitelist icin sabit cikis IP istiyor.
- Vercel Static IP aylik ek maliyetlidir.
- Lightsail static IP ile daha ucuz ve daha dogrudan cozum elde edilir.

## Onerilen Topoloji

- Ana site: `mikrokurs.com` Vercel'de kalir
- Odeme servisi: `pay.mikrokurs.com` AWS Lightsail'da calisir
- Bu yeni alan adi yeni domain satin almak degildir; mevcut domainin alt alanidir

## 1. Lightsail Sunucusu Olustur

- Ubuntu 24.04 LTS sec
- 1 GB RAM plani yeterli olur
- Sunucu olustuktan sonra bir `Static IP` ata
- Bu `Static IP`, bankaya gidecek whitelist IP'dir

## 2. DNS

Alan adinda su kaydi ekle:

- `pay.mikrokurs.com` -> Lightsail static IP

## 3. Sunucuya Baglan

```bash
ssh ubuntu@SUNUCU_IP
```

## 4. Paketler

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx certbot python3-certbot-nginx git
```

## 5. Kodu Sunucuya Al

```bash
sudo mkdir -p /opt/mikrokurs-payment
sudo chown ubuntu:ubuntu /opt/mikrokurs-payment
git clone REPO_URL /opt/mikrokurs-payment
cd /opt/mikrokurs-payment
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

## 6. Env Dosyasi

Ornek dosyayi kopyala:

```bash
cp payment_service/.env.aws.example /opt/mikrokurs-payment/.env
nano /opt/mikrokurs-payment/.env
```

Buraya gercek DB ve QNB bilgilerini yaz.

## 7. systemd Servisi

```bash
sudo cp payment_service/systemd/mikrokurs-payment.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mikrokurs-payment
sudo systemctl start mikrokurs-payment
sudo systemctl status mikrokurs-payment
```

## 8. Nginx Reverse Proxy

```bash
sudo cp payment_service/nginx/pay.mikrokurs.com.conf /etc/nginx/sites-available/pay.mikrokurs.com.conf
sudo ln -s /etc/nginx/sites-available/pay.mikrokurs.com.conf /etc/nginx/sites-enabled/pay.mikrokurs.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 9. SSL

```bash
sudo certbot --nginx -d pay.mikrokurs.com
```

## 10. Ana Proje Env Degisikligi

Vercel'deki ana projeye su env'i ekle:

```text
PAYMENT_PUBLIC_BASE_URL=https://pay.mikrokurs.com
NEXT_PUBLIC_PAYMENT_API_URL=https://pay.mikrokurs.com
```

Sonra ana projeyi tekrar deploy et:

```bash
npx vercel --prod
```

## 11. Bankaya Gonderilecek IP

Bankaya gidecek IP:

- Lightsail sunucusuna bagladigin `Static IP`

Client IP veya Vercel IP gonderilmez.

## 12. Kontrol

Sunucuda:

```bash
curl http://127.0.0.1:8000/health
curl https://pay.mikrokurs.com/health
journalctl -u mikrokurs-payment -n 200 --no-pager
```
