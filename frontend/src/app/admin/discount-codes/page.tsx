"use client"
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DiscountCode {
  id: number;
  code: string;
  percent: number;
  active: boolean;
}

export default function DiscountCodesAdminPage() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [newCode, setNewCode] = useState('');
  const [percent, setPercent] = useState(10);
  const [error, setError] = useState('');

  const handleAddCode = () => {
    setError('');
    if (!newCode || percent < 1 || percent > 100) {
      setError('Kod ve oran geçerli olmalı!');
      return;
    }
    if (codes.some(c => c.code === newCode)) {
      setError('Bu kod zaten mevcut!');
      return;
    }
    setCodes([...codes, { id: Date.now(), code: newCode, percent, active: true }]);
    setNewCode('');
    setPercent(10);
  };

  const handleDelete = (id: number) => {
    setCodes(codes.filter(c => c.id !== id));
  };

  const handleToggle = (id: number) => {
    setCodes(codes.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">İndirim Kodları Yönetimi</h1>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex gap-4 mb-2">
            <input
              type="text"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
              placeholder="İndirim kodu"
              className="border px-3 py-2 rounded w-1/2"
            />
            <input
              type="number"
              value={percent}
              onChange={e => setPercent(Number(e.target.value))}
              min={1}
              max={100}
              className="border px-3 py-2 rounded w-1/4"
              placeholder="%"
            />
            <Button onClick={handleAddCode}>Ekle</Button>
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Mevcut Kodlar</h2>
          {codes.length === 0 ? (
            <div className="text-gray-500">Henüz indirim kodu yok.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Kod</th>
                  <th className="text-left">Oran (%)</th>
                  <th className="text-left">Durum</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {codes.map(code => (
                  <tr key={code.id}>
                    <td>{code.code}</td>
                    <td>{code.percent}</td>
                    <td>
                      <Button size="sm" variant={code.active ? 'default' : 'outline'} onClick={() => handleToggle(code.id)}>
                        {code.active ? 'Aktif' : 'Pasif'}
                      </Button>
                    </td>
                    <td>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(code.id)}>
                        Sil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
