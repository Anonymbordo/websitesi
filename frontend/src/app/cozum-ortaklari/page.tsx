
export default function CozumOrtaklariPage() {
  return (
    <div className="w-full bg-white">
      <div className="min-h-screen max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Çözüm Ortağımız</h1>
        <p className="text-lg text-gray-700 mb-10 text-center">
          Mikrokurs olarak ödeme altyapısında <span className="font-bold text-green-700">PayTR</span> ile çalışıyoruz. Tüm ödemelerinizde hızlı, güvenli ve sorunsuz bir deneyim sunmak için Türkiye'nin lider ödeme sistemi PayTR ile iş birliği yapıyoruz.
        </p>
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-md">
            <img src="/logo/paytr.png" alt="PayTR" className="h-16 mb-6" style={{objectFit:'contain'}} />
            <h2 className="text-2xl font-bold mb-2 text-green-700">PayTR</h2>
            <p className="text-gray-600 text-center text-lg mb-4">Türkiye'nin lider ödeme sistemleri ile tüm işlemlerinizde maksimum güvenlik ve hız.</p>
            <a href="https://www.paytr.com/" target="_blank" rel="noopener noreferrer" className="inline-block bg-green-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:bg-green-700 transition">PayTR Hakkında Daha Fazla Bilgi</a>
          </div>
        </div>
      </div>
    </div>
  );
}
