'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UploadsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dosya Yükleme</h1>
      <p className="text-sm text-gray-600">Sistem genelinde dosya yüklemelerini yönetin (medya, belgeler, içerik).</p>

      <Card>
        <CardHeader>
          <CardTitle>Yüklemeler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">Bu sayfada dosya yükleme yönetimi yapılır. Placeholder.</p>
          <div className="flex gap-2">
            <Button>Yükle</Button>
            <Button variant="outline">Klasör Oluştur</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
