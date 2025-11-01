'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bildirimler</h1>
      <p className="text-sm text-gray-600">E-posta, push ve SMS bildirim ayarlarını yönetin.</p>

      <Card>
        <CardHeader>
          <CardTitle>Bildirim Kanalları</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">Placeholder: SMTP, Push ve SMS konfigürasyonları burada olacak.</p>
          <div className="flex gap-2">
            <Button>Test Bildirimi Gönder</Button>
            <Button variant="outline">Ayarları Kaydet</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
