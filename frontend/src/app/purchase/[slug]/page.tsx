"use client";
import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Tag, ArrowLeft } from 'lucide-react';

const PurchasePage = () => {
  const router = useRouter();
  const params = useParams();
  const slugParam = params?.slug;
  const slug = typeof slugParam === 'string' ? slugParam : (Array.isArray(slugParam) ? slugParam[0] : "");
  const [discountCode, setDiscountCode] = useState('');
  const [originalPrice] = useState(299);
  const [price, setPrice] = useState(299);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Format slug for display
  const formatSlugForDisplay = (slug: string) => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) {
      alert('Lütfen bir indirim kodu giriniz');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/validate_discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discount_code: discountCode })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        const newPrice = price - data.discount;
        setPrice(newPrice);
        setDiscountApplied(true);
        alert(`İndirim uygulandı! Yeni fiyat: ₺${newPrice}`);
      } else {
        alert(data.message || 'Geçersiz indirim kodu!');
      }
    } catch (err) {
      alert('Sunucu hatası!');
    }
    setLoading(false);
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, price })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message);
        router.push(`/purchase/success/${slug}?price=${price}`);
      } else {
        alert(data.message || 'Satın alma başarısız!');
      }
    } catch (err) {
      alert('Sunucu hatası!');
    }
    setLoading(false);
  };

  const discountPercent = discountApplied ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri Dön
        </button>

        {/* Main Card */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                {formatSlugForDisplay(slug)}
              </h1>
              <p className="text-gray-600 text-lg">
                Bu dersin tüm içeriklerine erişmek için ₺{originalPrice} karşılığında satın alabilirsiniz.
              </p>
            </div>

            {/* Price Section */}
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-white text-center mb-8">
              <div className="mb-4">
                <div className="text-sm font-medium opacity-90 mb-2">Kurs Fiyatı</div>
                {discountApplied ? (
                  <div className="space-y-2">
                    <div className="text-2xl line-through opacity-75">₺{originalPrice.toLocaleString('tr-TR')}</div>
                    <div className="text-5xl font-bold">₺{price.toLocaleString('tr-TR')}</div>
                    <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
                      %{discountPercent} İndirim
                    </div>
                  </div>
                ) : (
                  <div className="text-5xl font-bold">₺{price.toLocaleString('tr-TR')}</div>
                )}
              </div>
            </div>

            {/* Discount Code Section */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                <Tag className="w-4 h-4 inline mr-2" />
                İndirim Kodu
              </label>
              <div className="flex gap-3">
                <Input
                  type="text"
                  placeholder="İndirim kodunuzu girin"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  disabled={loading || discountApplied}
                  className="flex-1 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20 text-lg"
                />
                <Button
                  onClick={handleApplyDiscount}
                  disabled={loading || discountApplied || !discountCode.trim()}
                  className="h-12 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold"
                >
                  {discountApplied ? 'Uygulandı' : 'Uygula'}
                </Button>
              </div>
              {discountApplied && (
                <p className="text-sm text-green-600 mt-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  İndirim kodu başarıyla uygulandı
                </p>
              )}
            </div>

            {/* Purchase Button */}
            <Button
              onClick={handlePurchase}
              disabled={loading}
              className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  İşleminiz Yapılıyor...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 mr-2" />
                  Satın Al - ₺{price.toLocaleString('tr-TR')}
                </div>
              )}
            </Button>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-600 text-center">
                🔒 Güvenli ödeme sistemi ile korunuyorsunuz
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PurchasePage;