'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ThemeSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tema & Tasarım</h1>
      <p className="text-sm text-gray-600">Site tasarımını ve tema ayarlarını buradan düzenleyin.</p>

      <Card>
        <CardHeader>
          <CardTitle>Renkler & Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">Placeholder arayüz - renk paleti ve logo yükleme özellikleri eklenecek.</p>
          <div className="flex gap-2">
            <Button>Değişiklikleri Kaydet</Button>
            <Button variant="outline">Değişiklikleri Sıfırla</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
