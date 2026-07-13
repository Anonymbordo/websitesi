"use client"

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage'

// Read config from NEXT_PUBLIC_* env vars (these are inlined at build time).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let _auth: ReturnType<typeof getAuth> | null = null
let _app: FirebaseApp | null = null
let _storage: ReturnType<typeof getStorage> | null = null

function ensureBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client-side code must run in the browser. Ensure this module is only imported from client components or code that runs in the browser.')
  }
}

function ensureConfig() {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error([
      'Missing Firebase configuration. Please add the Firebase web app config as NEXT_PUBLIC_FIREBASE_* env vars.',
      'Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID',
      'After adding them, restart the dev server (next dev).',
    ].join(' '))
  }
}

export function getFirebaseAuth() {
  ensureBrowser()
  if (_auth) return _auth
  _auth = getAuth(getFirebaseApp())
  return _auth
}

export function getFirebaseApp() {
  ensureBrowser()
  if (_app) return _app

  ensureConfig()

  if (!getApps().length) {
    _app = initializeApp(firebaseConfig as any)
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      import('firebase/analytics')
        .then(({ getAnalytics }) => {
          try {
            getAnalytics(_app as FirebaseApp)
          } catch (e) {
            console.warn('Firebase analytics init failed', e)
          }
        })
        .catch((err) => console.warn('Failed to load firebase/analytics', err))
    }
  } else {
    _app = getApps()[0] as FirebaseApp
  }

  return _app
}

export function getFirebaseStorage() {
  ensureBrowser()
  if (_storage) return _storage
  _storage = getStorage(getFirebaseApp())
  return _storage
}

function sanitizeStorageSegment(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'file'
}

export async function uploadFileToFirebaseStorage(file: File, basePath = 'uploads') {
  const storage = getFirebaseStorage()
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const safeName = sanitizeStorageSegment(file.name || 'file')
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`
  const fullPath = `${sanitizeStorageSegment(basePath)}/${year}/${month}/${uniqueName}`
  const fileRef = storageRef(storage, fullPath)

  await uploadBytes(fileRef, file, {
    contentType: file.type || 'application/octet-stream',
  })

  const downloadUrl = await getDownloadURL(fileRef)

  return {
    path: fullPath,
    downloadUrl,
  }
}

// Backwards-compatible named export used by older imports
export const firebaseGetAuth = getFirebaseAuth

export async function firebaseCreateUser(email: string, password: string) {
  const auth = getFirebaseAuth()
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function firebaseSendVerification(user: any) {
  // sendEmailVerification expects a User object
  return sendEmailVerification(user)
}

export async function firebaseSignIn(email: string, password: string) {
  const auth = getFirebaseAuth()
  return signInWithEmailAndPassword(auth, email, password)
}

export async function firebaseUpdateProfile(user: any, displayName: string) {
  return updateProfile(user, { displayName })
}

export async function firebaseSendPasswordReset(email: string) {
  const auth = getFirebaseAuth()
  return sendPasswordResetEmail(auth, email)
}

export default getFirebaseAuth
