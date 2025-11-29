import { Card, CardContent } from '@/components/ui/card'

export default function MesafeliSatisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-16">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="card-modern">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Mesafeli Satış Sözleşmesi</h1>

            <div className="prose text-gray-700">
              <h2>SATICI</h2>
              <p>
                Mikro Kurs<br />
                Bağlarbaşı Mahallesi Bağdat Caddesi No: 350/42 (Ercan İş Merkezi)<br />
                Maltepe/İstanbul<br />
                Vergi Dairesi: Küçükyalı<br />
                Vergi No: 3151217080
              </p>

              <h2>ALICI</h2>
              <p>Siteden sipariş veren kişi</p>

              <h2>KONU</h2>
              <p>
                Alıcının www.mikrokurs.com üzerinden dijital eğitim/e-kitap/kurs satın
                almasına ilişkin tarafların hak ve yükümlülüklerini düzenler.
              </p>

              <h3>MADDE 1 - ÜRÜN</h3>
              <p>Satılan ürün dijital eğitim/e-kitap/e-içeriktir. Fiziksel gönderim yapılmaz.</p>

              <h3>MADDE 2 – TESLİMAT</h3>
              <p>
                Ödeme onayından sonra içerik kullanıcı hesabına tanımlanarak dijital ortamda teslim
                edilir.
              </p>

              <h3>MADDE 3 – CAYMA HAKKI</h3>
              <p>
                Dijital içeriklere erişimin başlamasıyla birlikte cayma hakkı ortadan kalkar.
                (Yönetmelik Madde 15/ğ)
              </p>

              <h3>MADDE 4 – GENEL HÜKÜMLER</h3>
              <p>
                Alıcı, satın almadan önce tüm ürün açıklamalarını okuduğunu ve kabul ettiğini
                beyan eder.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
