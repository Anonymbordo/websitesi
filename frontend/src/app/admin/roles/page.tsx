'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Roller & İzinler</h1>
      <p className="text-sm text-gray-600">Kullanıcı rolleri ve izinlerini buradan yönetin.</p>

      <Card>
        <CardHeader>
          <CardTitle>Roller</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">Bu sayfada roller oluşturup düzenleyebilirsiniz. (Placeholder)</p>
          <div className="flex gap-2">
            <Button variant="outline">Yeni Rol Oluştur</Button>
            <Button>Rolleri Senkronize Et</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
