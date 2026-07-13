"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, CreditCard, Tag } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { coursesAPI, discountsAPI, paymentsAPI } from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface CheckoutCourse {
  id: number;
  title: string;
  description?: string;
  price: number;
  discount_price?: number | null;
}

const PurchasePage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const slugParam = params?.slug;
  const slug = typeof slugParam === "string" ? slugParam : Array.isArray(slugParam) ? slugParam[0] : "";
  const decodedSlug = slug ? decodeURIComponent(slug) : "";

  const [course, setCourse] = useState<CheckoutCourse | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [originalPrice, setOriginalPrice] = useState(0);
  const [price, setPrice] = useState(0);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvingCourse, setResolvingCourse] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void resolveCourse();
  }, [decodedSlug, searchParamsKey]);

  const resolveCourse = async () => {
    setResolvingCourse(true);
    setError("");
    try {
      const courseIdParam = searchParams.get("courseId");
      const response = courseIdParam
        ? await coursesAPI.getCourse(Number(courseIdParam))
        : await paymentsAPI.lookupCourseBySlug(decodedSlug);

      const data = response.data;
      const basePrice = Number(data.discount_price ?? data.price ?? 0);
      setCourse({
        id: Number(data.id),
        title: data.title,
        description: data.description,
        price: Number(data.price ?? basePrice),
        discount_price: data.discount_price ?? null,
      });
      setOriginalPrice(basePrice);
      setPrice(basePrice);
      setDiscountApplied(false);
    } catch (err: any) {
      console.error("Course resolve error:", err);
      setError("Satın alma bilgileri şu anda yüklenemiyor.");
    } finally {
      setResolvingCourse(false);
    }
  };

  const handleApplyDiscount = async () => {
    if (!course) {
      return;
    }

    if (!discountCode.trim()) {
      toast.error("Lütfen bir indirim kodu girin.");
      return;
    }

    setLoading(true);
    try {
      const response = await discountsAPI.validate(discountCode.trim(), "course", course.id);
      if (!response.data.valid) {
        toast.error(response.data.message || "Geçersiz indirim kodu.");
        return;
      }

      setPrice(Number(response.data.new_price ?? originalPrice));
      setDiscountApplied(true);
      toast.success(response.data.message || "İndirim kodu uygulandı.");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "İndirim kodu doğrulanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!course) {
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      const next = `/purchase/${encodeURIComponent(decodedSlug)}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      router.push(`/auth/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setLoading(true);
    try {
      const response = await paymentsAPI.createPayment(
        course.id,
        "qnb",
        discountApplied ? discountCode.trim() : "",
        decodedSlug || course.title
      );

      const checkoutUrl = response.data?.checkout_url;
      if (!checkoutUrl) {
        throw new Error("Ödeme yönlendirmesi üretilemedi.");
      }

      window.location.href = checkoutUrl;
    } catch (err: any) {
      console.error("Purchase start error:", err);
      toast.error(err?.response?.data?.detail || "İşlem şu anda başlatılamıyor. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  const discountPercent = discountApplied && originalPrice > 0
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Geri Dön
        </button>

        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            {resolvingCourse ? (
              <div className="py-16 text-center text-gray-600">Satın alma bilgileri yükleniyor...</div>
            ) : error || !course ? (
              <div className="py-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Satın alma başlatılamadı</h1>
                <p className="text-gray-600 mb-6">{error || "Kurs bilgisi bulunamadı."}</p>
                <Button onClick={() => router.push("/courses")} variant="outline">
                  Kurslara Dön
                </Button>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                    {course.title}
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Bu kursun tüm içeriklerine erişmek için satın alma işlemini tamamlayın.
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white text-center mb-8">
                  <div className="mb-4">
                    <div className="text-sm font-medium opacity-90 mb-2">Ödenecek Tutar</div>
                    {discountApplied ? (
                      <div className="space-y-2">
                        <div className="text-2xl line-through opacity-75">{formatPrice(originalPrice)}</div>
                        <div className="text-5xl font-bold">{formatPrice(price)}</div>
                        <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-semibold">
                          %{discountPercent} İndirim
                        </div>
                      </div>
                    ) : (
                      <div className="text-5xl font-bold">{formatPrice(price)}</div>
                    )}
                  </div>
                </div>

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
                      onChange={(event) => setDiscountCode(event.target.value)}
                      disabled={loading || discountApplied}
                      className="flex-1 h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-blue-500/20 text-lg"
                    />
                    <Button
                      onClick={handleApplyDiscount}
                      disabled={loading || discountApplied || !discountCode.trim()}
                      className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold"
                    >
                      {discountApplied ? "Uygulandı" : "Uygula"}
                    </Button>
                  </div>
                  {discountApplied && (
                    <p className="text-sm text-green-600 mt-2 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      İndirim kodu başarıyla uygulandı
                    </p>
                  )}
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      İşlem sayfasına yönlendiriliyor...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <CreditCard className="w-6 h-6 mr-2" />
                      Satın Al - {formatPrice(price)}
                    </div>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PurchasePage;
