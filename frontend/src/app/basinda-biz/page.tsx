
export default function BasindaBizPage() {
  return (
    <div className="w-full bg-white">
      <div className="min-h-screen max-w-3xl mx-auto py-16 px-4">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-900">Basında Biz</h1>
        <p className="text-lg text-gray-700 mb-10 text-center">
          Mikrokurs, dijital eğitimdeki yenilikçi çözümleriyle ulusal ve yerel basında sıkça yer almaktadır. Yapay zeka destekli eğitim ve sınav hazırlık sistemlerimizle ilgili öne çıkan haber ve röportajlarımızı aşağıda bulabilirsiniz.
        </p>
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-md">
            <img src="/logo/hurriyet.png" alt="Hürriyet" className="h-16 mb-6" style={{objectFit:'contain'}} />
            <h2 className="text-2xl font-bold mb-2 text-blue-700">Hürriyet Gazetesi</h2>
            <p className="text-gray-600 text-center text-lg mb-4">“Mikrokurs, yapay zeka ile kişiselleştirilmiş eğitimde yeni bir dönem başlatıyor.”</p>
            <a href="#" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-full font-semibold shadow hover:bg-blue-700 transition">Haberi Görüntüle</a>
          </div>
        </div>
      </div>
    </div>
  );
}
