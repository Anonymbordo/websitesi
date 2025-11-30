'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsCoursesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kurs Performansı</h1>
      <p className="text-sm text-gray-600">Kurslara ait performans metriklerini görüntüleyin.</p>

      <Card>
        <CardHeader>
          <CardTitle>En Çok Satılan Kurslar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">Placeholder: Gerçek veriler admin API'sinden alınacak.</p>
        </CardContent>
      </Card>
    </div>
  )
}
