import { Card, CardContent } from '@/components/ui/card'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-16">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="card-modern">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Çerez Politikası</h1>

            <div className="prose text-gray-700">
              <p>
                www.mikrokurs.com ("Site") çerezleri (cookies) kullanır. Çerezler, web sitelerinin
                cihazınıza yerleştirdiği küçük metin dosyalarıdır; site deneyiminizi geliştirmek,
                analiz yapmak ve tercihlerinizi hatırlamak için kullanılır.
              </p>

              <h2>Çerez Türleri</h2>
              <ul>
                <li><strong>Gerekli Çerezler:</strong> Site işlevselliği için zorunludur. Ödeme ve güvenlik gibi temel servisler için kullanılır.</li>
                <li><strong>Performans/Analitik Çerezler:</strong> Site kullanımını analiz ederek performans iyileştirmeleri sağlar (ör. Google Analytics).</li>
                <li><strong>Fonksiyonel Çerezler:</strong> Tercihlerinizi hatırlamak için kullanılır (örn. dil, tema).</li>
                <li><strong>Pazarlama/İzleme Çerezleri:</strong> Reklam ve pazarlama amaçlı, üçüncü taraf hizmetleri tarafından yerleştirilebilir.</li>
              </ul>

              <h2>Üçüncü Taraf Çerezleri</h2>
              <p>
                Bazı çerezler üçüncü taraf hizmet sağlayıcılar (ör. ödeme sağlayıcılar, analitik
                araçlar veya reklam ağları) tarafından yerleştirilir. Bu üçüncü tarafların çerez
                politikaları kendi gizlilik politikalarına tabidir.
              </p>

              <h2>Çerez Tercihlerini Yönetme</h2>
              <p>
                Çerezleri cihazınız üzerinden tarayıcı ayarları ile yönetebilir veya silebilirsiniz.
                Tarayıcı çerezlerini devre dışı bırakmak bazı site özelliklerinin çalışmamasına neden
                olabilir.
              </p>

              <h2>İletişim</h2>
              <p>
                Çerez politikamız hakkında sorularınız için <strong>info@mikrokurs.com</strong> adresiyle
                bizimle iletişime geçebilirsiniz.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
