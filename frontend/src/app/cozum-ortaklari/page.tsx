import { CreditCard, ShieldCheck } from 'lucide-react'

export default function CozumOrtaklariPage() {
  return (
    <div className="w-full bg-white">
      <div className="min-h-screen max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Çözüm Ortaklarımız</h1>
        <p className="text-lg text-gray-700 mb-10 text-center">
          Mikrokurs olarak ödeme ve operasyon süreçlerinde güvenli, güncel ve kesintisiz çalışan
          altyapılarla ilerliyoruz. Tüm işlemlerinizde hızlı, güvenli ve sorunsuz bir deneyim
          sunmaya odaklanıyoruz.
        </p>
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-md">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-emerald-700">Güvenli Ödeme Altyapısı</h2>
            <p className="text-gray-600 text-center text-lg mb-6">
              Ödeme akışlarımız modern güvenlik standartları, şifreli veri aktarımı ve kullanıcı
              güvenliğini önceleyen altyapılar üzerinden yürütülmektedir.
            </p>
            <div className="w-full rounded-2xl bg-slate-50 p-5 text-left text-sm text-slate-700 space-y-3">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-emerald-700 mt-0.5" />
                <span>Kart ve ödeme verileri güvenli kanallar üzerinden işlenir.</span>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-700 mt-0.5" />
                <span>Ödeme süreçlerinde güvenlik ve yasal uyumluluk önceliklidir.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
