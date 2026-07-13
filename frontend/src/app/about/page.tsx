'use client'

import { BookOpen, CheckCircle, Globe, Target } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const missionPoints = [
  'Öğrenmeyi herkes için erişilebilir ve pratik kılmak',
  'Kullanıcıların hedeflerine en kısa sürede ulaşmasını sağlamak',
  'Güncel, kaliteli ve uzmanlar tarafından hazırlanan mikro eğitimler sunmak',
]

const visionPoints = [
  "Türkiye'nin en güvenilir ve en çok tercih edilen mikro eğitim platformu olmak",
  'Dijital eğitimde yenilikçi içeriklerle global ölçekte büyümek',
]

export default function AboutPage() {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('local_pages')
      if (raw) {
        const pages = JSON.parse(raw)
        const found = pages.find((p: any) => ((p.slug || '').toString().replace(/^\//, '') === 'about'))
        if (found && found.content) {
          return (
            <div className="max-w-4xl mx-auto p-8 space-y-6">
              <h1 className="text-3xl font-bold">{found.title}</h1>
              <div className="prose" dangerouslySetInnerHTML={{ __html: found.content }} />
            </div>
          )
        }
      }
    } catch (e) {
      // ignore and render default
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-lg">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-700 bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
              Hakkımızda
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-700">
              MİKRO KURS, öğrencilerin akademik başarılarını desteklemek amacıyla geliştirilmiş
              yeni nesil bir eğitim platformudur.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.18fr,0.82fr]">
            <Card className="border-0 bg-white/90 shadow-xl backdrop-blur-sm">
              <CardContent className="space-y-6 p-8 md:p-10">
                <div className="inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  Yeni nesil eğitim yaklaşımı
                </div>

                <div className="space-y-5 text-base leading-8 text-slate-700 md:text-lg">
                  <p>
                    MİKRO KURS, öğrencilerin akademik başarılarını desteklemek amacıyla
                    geliştirilmiş yeni nesil bir eğitim platformudur.
                  </p>
                  <p>
                    Kurucusu Sayın Necati Akpınar'ın (BKM'nin sahibi) abisi Sayın Vehbi Akpınar
                    olan MİKRO KURS, teknolojiyi eğitimle buluşturarak öğrencilere modern ve
                    etkili öğrenme deneyimleri sunmaktadır.
                  </p>
                  <p>
                    Kısa, net ve çözüm odaklı eğitim videolarıyla konuların hızlı ve kalıcı şekilde
                    öğrenilmesini sağlayarak başarıya giden yolda güçlü bir destek sunar.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card className="overflow-hidden border-0 bg-white/90 shadow-xl backdrop-blur-sm">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src="/about-whatsapp-photo.jpeg?v=20260618"
                      alt="MİKRO KURS kurumsal ekip fotoğrafı"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/58 via-transparent to-slate-950/10" />
                    <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white backdrop-blur">
                      Mikro Kurs
                    </div>
                  </div>

                  <div className="space-y-3 px-6 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-blue-700">
                      Kurumsal Kare
                    </p>
                    <h2 className="text-2xl font-bold leading-tight text-slate-900">
                      Güven veren, samimi ve güçlü bir eğitim markası
                    </h2>
                    <p className="text-sm leading-7 text-slate-600">
                      MİKRO KURS&apos;un eğitim yaklaşımını ve kurumsal duruşunu yansıtan bu kare,
                      markanın arkasındaki insan hikayesini daha görünür hale getirir.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl">
                <CardContent className="p-8">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium">
                    <Target className="h-4 w-4" />
                    Odağımız
                  </div>
                  <h2 className="text-2xl font-bold leading-tight">
                    Teknolojiyi eğitimle buluşturan modern ve etkili öğrenme deneyimi
                  </h2>
                  <p className="mt-4 text-sm leading-7 text-blue-100">
                    Kısa, net ve çözüm odaklı eğitim videolarıyla öğrencilerin konuları daha hızlı,
                    daha kalıcı ve daha verimli şekilde öğrenmesini hedefliyoruz.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <Card className="border-0 bg-white/90 shadow-lg backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Target className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Misyonumuz</h2>
              </div>

              <div className="space-y-4">
                {missionPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-slate-700">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <p className="leading-7">{point}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/90 shadow-lg backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Globe className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Vizyonumuz</h2>
              </div>

              <div className="space-y-4">
                {visionPoints.map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-4 text-slate-700">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <p className="leading-7">{point}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 px-8 py-12 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-bold">Mikro Kurs ile öğrenmeye hemen başlayın</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-blue-100">
            Kısa, etkili ve odaklı eğitim içerikleriyle bilgiye daha hızlı ulaşın ve hedeflerinize
            daha pratik bir şekilde ilerleyin.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/courses">
              <Button size="lg" className="rounded-xl bg-white px-8 text-blue-700 hover:bg-slate-100">
                Kursları İncele
              </Button>
            </Link>
            <Link href="/auth/register-instructor">
              <Button
                size="lg"
                variant="ghost"
                className="rounded-xl border border-white/70 bg-transparent px-8 text-white hover:bg-white hover:text-blue-700"
              >
                Eğitmen Ol
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
