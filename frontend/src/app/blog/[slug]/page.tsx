'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function BlogPostPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const [post, setPost] = useState<any | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('local_blogs')
      const blogs = raw ? JSON.parse(raw) : []
      const found = blogs.find((b: any) => b.slug === slug)
      setPost(found || null)
    } catch (err) {
      console.error('post okunamadı', err)
    }
  }, [slug])

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-gray-600">Yazı bulunamadı.</div>
        <div className="mt-6">
          <Button onClick={() => router.push('/blog')}>Blog'a Dön</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-12">
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{new Date(post.created_at).toLocaleString()}</p>
      {post.featured_image && (
        <img src={post.featured_image} alt={post.title} className="w-full h-72 object-cover rounded-md mb-6" />
      )}

      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  )
}
