'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

export default function BlogListPage() {
  const [posts, setPosts] = useState<any[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('local_blogs')
      const blogs = raw ? JSON.parse(raw) : []
      setPosts(blogs)
    } catch (err) {
      console.error('blog okunamadı', err)
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-6">Blog</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {posts.length === 0 && (
          <div className="text-gray-600">Henüz blog yazısı yok.</div>
        )}

        {posts.map(post => (
          <Card key={post.id} className="overflow-hidden">
            <CardContent className="p-6">
              {post.featured_image && (
                <img src={post.featured_image} alt={post.title} className="w-full h-48 object-cover rounded-md mb-4" />
              )}
              <h2 className="text-xl font-bold mb-2">{post.title}</h2>
              <p className="text-sm text-gray-600 mb-4">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="text-sm text-blue-600">Devamını oku →</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
