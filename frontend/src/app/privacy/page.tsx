import { Card, CardContent } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-16">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="card-modern">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Gizlilik Politikası</h1>

            <div className="prose text-gray-700">
              <p>
                Mikro Kurs olarak, kullanıcılarımızın kişisel verilerinin gizliliği ve güvenliği
                bizim için önemlidir. Bu nedenle bilgileriniz, 6698 sayılı KVKK ve ilgili mevzuata
                uygun şekilde işlenmektedir.
              </p>

              <p>
                Sitemiz üzerinden işlem yapan kullanıcıların; Ad – Soyad, E-posta, telefon ve ödeme
                bilgileri yalnızca hizmet sunumu amacıyla alınır ve üçüncü kişilerle paylaşılmaz.
                Ödeme bilgileriniz güvenli ödeme altyapısı üzerinden şifrelenerek işlenir ve
                tarafımızca saklanmaz.
              </p>

              <p>
                Kullanıcılar, kişisel verilerinin silinmesini talep etme hakkına sahiptir. Bu
                talepleriniz için lütfen <strong>info@mikrokurs.com</strong> adresine e-posta gönderiniz.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
