import { Card, CardContent } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-16">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="card-modern">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Kullanım Şartları</h1>

            <div className="prose text-gray-700">
              <p>
                Bu Kullanım Şartları, www.mikrokurs.com ("Site") üzerinden sunulan hizmetlerin
                kullanım koşullarını düzenler. Siteyi kullanarak bu şartları ve ilgili politikaları
                kabul etmiş olursunuz.
              </p>

              <h2>1. Hizmetin Kapsamı</h2>
              <p>
                Site, dijital eğitim, e-kitap ve ilgili içerikler ile çevrimiçi öğrenme hizmetleri
                sunmaktadır. Site üzerinden satın alınan ürünler dijital niteliklidir.
              </p>

              <h2>2. Kayıt ve Hesap Güvenliği</h2>
              <p>
                Bazı hizmetlere erişim için hesap oluşturmanız gerekebilir. Hesap bilgilerinizin
                gizliliğinden siz sorumlusunuz; parolanızı başkalarıyla paylaşmayınız.
              </p>

              <h2>3. Kullanıcı Yükümlülükleri</h2>
              <p>
                Kullanıcılar, Site'yi yasalara uygun, dürüst ve başkalarının haklarını ihlal etmeyecek
                şekilde kullanmayı kabul eder. Herhangi bir zararlı yazılım, telif hakkı ihlali veya
                uygunsuz içerik paylaşımı yasaktır.
              </p>

              <h2>4. Fikri Mülkiyet</h2>
              <p>
                Site içeriğinin tüm hakları saklıdır. İçeriklerin çoğaltılması, dağıtılması veya
                üçüncü şahıslara sunulması için yazılı izin gereklidir.
              </p>

              <h2>5. Sorumluluk Sınırları</h2>
              <p>
                Site, içeriklerin doğruluğu ve erişilebilirliği için azami gayreti gösterir ancak
                doğrudan veya dolaylı zararlardan sorumlu tutulamaz. Ödeme, erişim veya teknik
                sorunlarda destek sağlanacaktır.
              </p>

              <h2>6. Politikalarda Değişiklik</h2>
              <p>
                Site, kullanım şartlarında ve ilgili politikalarda önceden bildirilmeksizin değişiklik
                yapma hakkını saklı tutar. Önemli değişiklikler ilgili sayfadan duyurulacaktır.
              </p>

              <h2>7. İletişim</h2>
              <p>
                Her türlü soru, şikayet veya yasal bildirimler için lütfen <strong>info@mikrokurs.com</strong>
                adresi üzerinden bizimle iletişime geçiniz.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
