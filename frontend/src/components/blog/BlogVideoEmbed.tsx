'use client'

import { ExternalLink, PlayCircle } from 'lucide-react'
import { getBlogVideoSource } from '@/lib/blog'

type BlogVideoEmbedProps = {
  url?: string | null
  title?: string | null
  className?: string
}

export function BlogVideoEmbed({ url, title, className = '' }: BlogVideoEmbedProps) {
  const source = getBlogVideoSource(url)

  if (!source) return null

  if (source.kind === 'file') {
    return (
      <div className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-black shadow-xl ${className}`}>
        <div className="aspect-video">
          <video
            src={source.src}
            controls
            preload="metadata"
            className="h-full w-full"
          >
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        </div>
      </div>
    )
  }

  if (source.kind === 'iframe') {
    return (
      <div className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-xl ${className}`}>
        <div className="aspect-video">
          <iframe
            src={source.src}
            title={title || 'Blog videosu'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    )
  }

  return (
    <a
      href={source.src}
      target="_blank"
      rel="noreferrer"
      className={`flex aspect-video items-center justify-center gap-3 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 text-center text-white shadow-xl transition-transform hover:scale-[1.01] ${className}`}
    >
      <PlayCircle className="h-8 w-8 text-cyan-300" />
      <span className="font-medium">{title || 'Videoyu yeni sekmede aç'}</span>
      <ExternalLink className="h-5 w-5 text-white/80" />
    </a>
  )
}
