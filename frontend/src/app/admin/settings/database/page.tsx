'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DatabaseSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Veritabanı</h1>
      <p className="text-sm text-gray-600">Veritabanı bağlantıları, yedekleme ve kurtarma seçenekleri.</p>

      <Card>
        <CardHeader>
          <CardTitle>Yedekleme & Kurtarma</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">Placeholder: Yedekleme ve kurtarma işlemleri buradan yönetilecek.</p>
          <div className="flex gap-2">
            <Button>Yedek Oluştur</Button>
            <Button variant="outline">Geri Yükle</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
