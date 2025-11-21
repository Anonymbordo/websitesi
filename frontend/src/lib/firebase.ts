"use client"

import { initializeApp, getApps } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'

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

  ensureConfig()

  // Only initialize app in browser and only once
  if (!getApps().length) {
    initializeApp(firebaseConfig as any)
    // Initialize analytics only in browser and when measurementId is present.
    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      import('firebase/analytics')
        .then(({ getAnalytics }) => {
          try {
            // use the initialized app
            const app = getApps()[0]
            getAnalytics(app)
          } catch (e) {
            console.warn('Firebase analytics init failed', e)
          }
        })
        .catch((err) => console.warn('Failed to load firebase/analytics', err))
    }
  }

  _auth = getAuth()
  return _auth
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
