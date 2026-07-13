import { Card, CardContent } from '@/components/ui/card'

export default function InstructorServiceAgreementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-16">
      <div className="max-w-4xl mx-auto p-8">
        <Card className="card-modern">
          <CardContent className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">
              Öğretmen Hizmeti İşbirliği Sözleşmesi
            </h1>

            <div className="prose text-gray-700">
              <p>
                İşbu Öğretmen Hizmeti İşbirliği Sözleşmesi ("Sözleşme"), eğitmen olarak platformda
                içerik üreten kullanıcı ("Eğitmen") ile Mikrokurs platformu ("Platform") arasında,
                aşağıda belirtilen şartlar dahilinde akdedilmiştir.
              </p>

              <h2>1. Konu ve Kapsam</h2>
              <p>
                Sözleşmenin konusu, Eğitmenin Platform üzerinde eğitim içerikleri oluşturması, canlı
                veya kayıtlı eğitim hizmeti sunması ve bu hizmetin Platform tarafından yayınlanması,
                listelenmesi ve yönetilmesine ilişkin koşulların belirlenmesidir.
              </p>

              <h2>2. Eğitmenin Beyan ve Taahhütleri</h2>
              <ul>
                <li>Eğitmen, sağladığı tüm bilgi ve belgelerin doğru, güncel ve hukuka uygun olduğunu beyan eder.</li>
                <li>Eğitmen, içeriklerin telif, marka, kişilik ve benzeri üçüncü kişi haklarını ihlal etmeyeceğini kabul eder.</li>
                <li>Eğitmen, Platform’un kalite standartlarına, topluluk kurallarına ve yürürlükteki mevzuata uygun davranır.</li>
                <li>Eğitmen, öğrenci verilerini yalnızca hizmet amacıyla kullanacağını ve gizli tutacağını taahhüt eder.</li>
              </ul>

              <h2>3. Platformun Hak ve Yükümlülükleri</h2>
              <p>
                Platform, içerikleri teknik ve idari incelemeye tabi tutabilir; mevzuata aykırılık,
                kalite yetersizliği veya kullanıcı güvenliğini tehdit eden hallerde içerikleri geçici
                olarak askıya alabilir veya yayından kaldırabilir.
              </p>

              <h2>4. Fikri Mülkiyet ve Kullanım Lisansı</h2>
              <p>
                Eğitmen, içerikler üzerindeki hak sahipliğinin kendisine ait olduğunu beyan eder.
                Eğitmen, Platforma içerikleri barındırma, çoğaltma, dijital ortamda yayınlama ve
                hizmetin sunulması için gerekli ölçüde işleme konusunda sınırlı bir kullanım lisansı verir.
              </p>

              <h2>5. Ücretlendirme ve Ödeme</h2>
              <p>
                Eğitmen gelir paylaşımı, ödeme dönemi, komisyon ve kesinti koşulları Platform’un güncel
                finansal politikalarına göre uygulanır. Vergisel yükümlülükler mevzuata uygun şekilde
                ilgili tarafa aittir.
              </p>

              <h2>6. Gizlilik ve Kişisel Verilerin Korunması</h2>
              <p>
                Taraflar, hizmet kapsamında edindikleri kişisel verileri yalnızca hukuka uygun amaçlarla
                işleyeceklerini, yetkisiz üçüncü kişilerle paylaşmayacaklarını ve gerekli idari/teknik
                tedbirleri alacaklarını kabul eder.
              </p>

              <h2>7. Sorumluluk Sınırı</h2>
              <p>
                Platform, mücbir sebep, üçüncü taraf hizmet kesintileri, internet altyapısı kaynaklı
                sorunlar ve benzeri durumlarda ortaya çıkabilecek dolaylı zararlardan sorumlu tutulamaz.
              </p>

              <h2>8. Sözleşmenin Süresi ve Feshi</h2>
              <p>
                Bu Sözleşme, Eğitmenin kabul beyanı ile yürürlüğe girer. Taraflar, mevzuata ve Platform
                kurallarına uygun şekilde Sözleşmeyi sona erdirebilir. Fesih halinde doğmuş hak ve
                yükümlülükler saklıdır.
              </p>

              <h2>9. Uyuşmazlıkların Çözümü</h2>
              <p>
                İşbu Sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır; yetkili
                mahkeme ve icra daireleri, ilgili mevzuat hükümlerine göre belirlenir.
              </p>

              <h2>10. İletişim</h2>
              <p>
                Sözleşmeye ilişkin talepler için <strong>info@mikrokurs.com</strong> adresi üzerinden
                Platform ile iletişime geçebilirsiniz.
              </p>

              <h2>11. Telif ve Kullanım Hakkı</h2>
              <p>
                Platformun kapanması veya Platform ile Eğitmen arasındaki hizmet ilişkisinin sona ermesi
                halinde, Eğitmen tarafından yüklenen videoların telif ve kullanım hakları tamamen Eğitmene
                ait olur. Bu durumda Platformun söz konusu videoları kullanma hakkı sona ermiş kabul edilir.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
