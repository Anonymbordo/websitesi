"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, BookOpen, ArrowRight } from 'lucide-react';

const PurchaseSuccess = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-12 px-4 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-12 text-center">
            {/* Success Icon */}
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              🎉 Satın Alma Başarılı!
            </h1>
            
            <p className="text-xl text-gray-600 mb-8">
              Satın alma işleminiz başarıyla tamamlandı. Ders içeriklerine erişebilirsiniz.
            </p>

            {/* Features */}
            <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-gray-900 mb-4 text-center">✨ Artık Erişiminiz Var</h3>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  Tüm ders içeriklerine sınırsız erişim
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  İnteraktif alıştırmalar ve testler
                </li>
                <li className="flex items-center text-gray-700">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  Sertifika alma hakkı
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push('/student/courses')}
                className="h-14 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Kurslarıma Git
              </Button>
              
              <Button
                onClick={() => router.push('/courses')}
                variant="outline"
                className="h-14 px-8 border-2 border-gray-300 hover:border-gray-400 rounded-xl text-lg font-semibold transition-all duration-300"
              >
                Diğer Kurslara Göz At
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Thank You Note */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-gray-600">
                🙏 Bizi tercih ettiğiniz için teşekkür ederiz!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PurchaseSuccess;
