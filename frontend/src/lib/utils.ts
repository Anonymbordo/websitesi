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

// Location & Distance utilities

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - Latitude of point 1
 * @param lon1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lon2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Format distance for display
 * @param km - Distance in kilometers
 * @returns Formatted string (e.g., "5.2 km" or "850 m")
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

/**
 * Get user's current location
 * @returns Promise with {latitude, longitude} or null if denied
 */
export async function getUserLocation(): Promise<{
  latitude: number
  longitude: number
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        resolve(null)
      }
    )
  })
}

/**
 * Sort items by distance from user location
 * @param items - Array of items with latitude/longitude
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @returns Sorted array with distance property added
 */
export function sortByDistance<T extends { latitude?: number; longitude?: number }>(
  items: T[],
  userLat: number,
  userLon: number
): (T & { distance?: number })[] {
  return items
    .map((item) => {
      if (item.latitude && item.longitude) {
        const distance = calculateDistance(userLat, userLon, item.latitude, item.longitude)
        return { ...item, distance }
      }
      return { ...item, distance: undefined }
    })
    .sort((a, b) => {
      if (a.distance === undefined) return 1
      if (b.distance === undefined) return -1
      return a.distance - b.distance
    })
}

/**
 * Filter items within a certain distance
 * @param items - Array of items with latitude/longitude
 * @param userLat - User's latitude
 * @param userLon - User's longitude
 * @param maxDistanceKm - Maximum distance in kilometers
 * @returns Filtered array
 */
export function filterByDistance<T extends { latitude?: number; longitude?: number }>(
  items: T[],
  userLat: number,
  userLon: number,
  maxDistanceKm: number
): T[] {
  return items.filter((item) => {
    if (!item.latitude || !item.longitude) return false
    const distance = calculateDistance(userLat, userLon, item.latitude, item.longitude)
    return distance <= maxDistanceKm
  })
}