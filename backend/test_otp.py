import requests
import json

BASE_URL = "http://localhost:8080"

# Test telefon numarası
phone = "5551234567"

print("📱 OTP Test Başlatılıyor...")
print(f"Telefon: {phone}\n")

# 1. OTP Gönder
print("1️⃣ OTP gönderiliyor...")
response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={"phone": phone})
print(f"Status: {response.status_code}")
data = response.json()
print(f"Response: {json.dumps(data, indent=2)}")

if response.status_code == 200 and "otp" in data:
    otp_code = data["otp"]
    print(f"\n✅ OTP Kodu: {otp_code}")
    
    # 2. OTP Doğrula
    print(f"\n2️⃣ OTP doğrulanıyor...")
    verify_response = requests.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"phone": phone, "otp_code": otp_code}
    )
    print(f"Status: {verify_response.status_code}")
    print(f"Response: {json.dumps(verify_response.json(), indent=2)}")
    
    if verify_response.status_code == 200:
        print("\n✅ OTP SİSTEMİ ÇALIŞIYOR!")
        print("\nŞimdi register sayfasından bu telefon ile kayıt olabilirsin:")
        print(f"  Telefon: {phone}")
        print("  OTP zaten doğrulandı!")
    else:
        print("\n❌ OTP doğrulama başarısız")
else:
    print("\n❌ OTP gönderimi başarısız")
