"use client";

import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';

export default function FenBilimleriBox() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-green-700 mb-4">4. Sınıf Fen Bilimleri</h1>
        <p className="text-lg text-gray-700 mb-8">Fen Bilimleri dersine ait içeriklere buradan ulaşabilirsiniz.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardContent className="p-6 flex flex-col items-center">
              <BookOpen className="w-12 h-12 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Konu Anlatımları</h2>
              <p className="text-gray-600 text-center mb-4">4. sınıf fen bilimleri konularının detaylı anlatımları.</p>
              {/* Buraya içerik listesi veya bağlantılar eklenebilir */}
            </CardContent>
          </Card>
          <Card className="shadow-lg">
            <CardContent className="p-6 flex flex-col items-center">
              <BookOpen className="w-12 h-12 text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Etkinlikler ve Testler</h2>
              <p className="text-gray-600 text-center mb-4">Konu pekiştirme etkinlikleri ve testler.</p>
              {/* Buraya test/etkinlik bağlantıları eklenebilir */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
