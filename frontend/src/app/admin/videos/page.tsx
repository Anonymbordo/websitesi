'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VideosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Video Yönetimi</h1>
      <p className="text-sm text-gray-600">Platformdaki kurs videolarını yönetebilir, yükleyebilir veya silebilirsiniz.</p>

      <Card>
        <CardHeader>
          <CardTitle>Video Kütüphanesi</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">Henüz gerçek video yönetimi bağlaması yok. Bu bir placeholder sayfadır.</p>
          <div className="flex gap-2">
            <Button>Yeni Video Yükle</Button>
            <Button variant="outline">Toplu İşlemler</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
