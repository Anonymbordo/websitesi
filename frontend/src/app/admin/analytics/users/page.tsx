'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AnalyticsUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kullanıcı Analizi</h1>
      <p className="text-sm text-gray-600">Kullanıcı davranışları ve demografik analizler.</p>

      <Card>
        <CardHeader>
          <CardTitle>Aktiflik Trendleri</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">Placeholder: Gerçek veriler admin API'sinden alınacak.</p>
        </CardContent>
      </Card>
    </div>
  )
}
