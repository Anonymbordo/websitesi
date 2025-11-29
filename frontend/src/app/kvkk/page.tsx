import { Card, CardContent } from '@/components/ui/card'

export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-16">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="card-modern">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">KVKK Aydınlatma Metni</h1>

            <div className="prose text-gray-700">
              <p>
                Mikro Kurs olarak; Ad, Soyad, Telefon, E-posta ve ödeme bilgileriniz; sipariş
                işlemlerinizin gerçekleştirilmesi, müşteri destek hizmetleri, yasal
                yükümlülüklerin yerine getirilmesi amacıyla işlenmektedir.
              </p>

              <p>
                Verileriniz üçüncü kişilerle paylaşılmaz, yalnızca ödeme sağlayıcı PAYTR ile
                işlenmektedir.
              </p>

              <p>
                Dilediğiniz zaman erişme, düzeltme, silme ve işlemeyi durdurma hakkınız
                bulunmaktadır. Bu talepleriniz için lütfen bize <strong>info@mikrokurs.com</strong> üzerinden
                ulaşınız.
              </p>

              <h2>Satıcı Bilgileri</h2>
              <p>
                Firma Ünvanı: Mikro Kurs<br />
                Şirket Türü: Şahıs Şirketi<br />
                Adres: Bağlarbaşı Mahallesi Bağdat Caddesi No : 350/42 (Ercan İş Merkezi) Maltepe/İstanbul<br />
                Vergi Dairesi: Küçükyalı<br />
                Vergi No: 3151217080<br />
                Telefon: 0216-766 26 25 / 0532-429 58 25<br />
                E-Posta: info@mikrokurs.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
