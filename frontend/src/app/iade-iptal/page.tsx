import { Card, CardContent } from '@/components/ui/card'

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-16">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="card-modern">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">İADE / İPTAL KOŞULLARI – MİKRO KURS</h1>

            <div className="prose text-gray-700">
              <p>
                Mikro Kurs üzerinden satılan ürünler dijital eğitim/e-kitap içerikleridir. Bu nedenle
                içeriklere erişim sağlandıktan sonra iptal veya iade yapılamaz.
              </p>

              <ul>
                <li>
                  <strong>İçeriğe erişim sağlandıktan sonra iptal veya iade yapılamaz.</strong>
                </li>
                <li>
                  Ödeme alınmış ancak erişim sağlanmamışsa, 24 saat içinde iade talep edilebilir.
                </li>
                <li>
                  Teknik bir hata nedeniyle kullanıcı içeriklere erişemezse, destek ücretsiz sağlanır.
                </li>
              </ul>

              <p>
                Herhangi bir iade talebiniz veya teknik sorun bildiriminiz için lütfen
                <strong> info@mikrokurs.com</strong> ile iletişime geçiniz.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
