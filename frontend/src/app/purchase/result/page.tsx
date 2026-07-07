"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, BookOpen, CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PurchaseResultContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "failed";
  const slug = searchParams.get("slug") || "";
  const courseTitle = searchParams.get("course") || "";
  const isSuccess = status === "success";

  const title = courseTitle || (slug
    ? slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Kurs");

  return (
    <div className={`min-h-screen py-12 px-4 flex items-center justify-center ${isSuccess ? "bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50" : "bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50"}`}>
      <div className="max-w-2xl w-full">
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-12 text-center">
            <div className="mb-8">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl ${isSuccess ? "bg-gradient-to-br from-green-500 to-emerald-600" : "bg-gradient-to-br from-orange-500 to-rose-600"}`}>
                {isSuccess ? (
                  <CheckCircle className="w-12 h-12 text-white" />
                ) : (
                  <AlertCircle className="w-12 h-12 text-white" />
                )}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {isSuccess ? "Satın Alma Başarılı" : "İşlem Tamamlanamadı"}
            </h1>

            <p className="text-xl text-gray-600 mb-6">
              <span className="font-semibold text-gray-900">{title}</span>
              {isSuccess ? " kursu hesabınıza tanımlandı." : " için işlem şu anda tamamlanamadı."}
            </p>

            <div className={`inline-block px-8 py-4 rounded-2xl mb-8 ${isSuccess ? "bg-gradient-to-r from-green-100 to-emerald-100" : "bg-gradient-to-r from-orange-100 to-rose-100"}`}>
              <p className="text-sm text-gray-600 mb-1">{isSuccess ? "İşlem Durumu" : "Durum"}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isSuccess ? "Ödeme Onaylandı" : "Ödeme Tamamlanamadı"}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => router.push(isSuccess ? "/student/courses" : `/purchase/${encodeURIComponent(slug)}`)}
                className={`h-14 px-8 text-white rounded-xl text-lg font-semibold shadow-lg ${isSuccess ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" : "bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-700 hover:to-rose-700"}`}
              >
                {isSuccess ? <BookOpen className="w-5 h-5 mr-2" /> : null}
                {isSuccess ? "Kurslarıma Git" : "Tekrar Dene"}
              </Button>

              <Button
                onClick={() => router.push("/courses")}
                variant="outline"
                className="h-14 px-8 border-2 border-gray-300 hover:border-gray-400 rounded-xl text-lg font-semibold"
              >
                Kurslara Dön
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const PurchaseResultFallback = () => (
  <div className="min-h-screen px-4 py-12 flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
  </div>
);

const PurchaseResultPage = () => (
  <Suspense fallback={<PurchaseResultFallback />}>
    <PurchaseResultContent />
  </Suspense>
);

export default PurchaseResultPage;
