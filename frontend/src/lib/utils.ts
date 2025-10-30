import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(price)
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

export function timeAgo(date: string | Date) {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Az önce'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün önce`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} ay önce`
  return `${Math.floor(diffInSeconds / 31536000)} yıl önce`
}

export function generateSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function validateEmail(email: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone: string) {
  const re = /^(\+90|0)?[0-9]{10}$/
  return re.test(phone.replace(/\s/g, ''))
}

export function formatPhone(phone: string) {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('90')) {
    return `+${cleaned}`
  }
  if (cleaned.startsWith('0')) {
    return `+9${cleaned}`
  }
  return `+90${cleaned}`
}