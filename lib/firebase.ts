import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, Database } from 'firebase/database'
import { getAuth, Auth } from 'firebase/auth'

// Trim env values to avoid stray whitespace/newlines breaking URL parsing
const clean = (v: string | undefined) => (v || '').trim()

// Normalize the Realtime Database URL. Accepts values like:
//   rmx-247-default-rtdb.firebaseio.com
//   https://rmx-247-default-rtdb.firebaseio.com/
//   rmx-247-default-rtdb.asia-southeast1.firebasedatabase.app
// and always returns a clean https URL without a trailing slash.
function normalizeDatabaseUrl(raw: string, projectId: string): string {
  let url = clean(raw)
  // Fall back to the conventional default RTDB URL if none was provided
  if (!url && projectId) {
    url = `https://${projectId}-default-rtdb.firebaseio.com`
  }
  if (!url) return ''
  // Strip any accidental surrounding quotes
  url = url.replace(/^['"]|['"]$/g, '')
  // Ensure scheme is present
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  // Remove trailing slash
  url = url.replace(/\/+$/, '')
  return url
}

// Default Firebase project config (rmx-247). These are public client-side
// values (safe to ship in the bundle). Environment variables, when present,
// always take precedence so the project can be swapped without a code change.
const DEFAULTS = {
  apiKey: 'AIzaSyArMEOZOQiMB0-Z6awk5xIXMSgULCsFvtM',
  authDomain: 'rmx-247.firebaseapp.com',
  databaseURL: 'https://rmx-247-default-rtdb.firebaseio.com',
  projectId: 'rmx-247',
  storageBucket: 'rmx-247.firebasestorage.app',
  messagingSenderId: '313616419459',
  appId: '1:313616419459:web:13c9e76ce6b442d63229b6',
  measurementId: 'G-25QTSK3V4L',
}

// Prefer the env var if set, otherwise fall back to the default value
const pick = (envValue: string | undefined, fallback: string) => clean(envValue) || fallback

// Firebase configuration
const projectId = pick(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, DEFAULTS.projectId)
const firebaseConfig = {
  apiKey: pick(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, DEFAULTS.apiKey),
  authDomain: pick(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, DEFAULTS.authDomain),
  databaseURL: normalizeDatabaseUrl(
    pick(process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, DEFAULTS.databaseURL),
    projectId,
  ),
  projectId,
  storageBucket: pick(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, DEFAULTS.storageBucket),
  messagingSenderId: pick(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, DEFAULTS.messagingSenderId),
  appId: pick(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, DEFAULTS.appId),
  measurementId: pick(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, DEFAULTS.measurementId),
}

// Initialize Firebase only on client side
let app
let database: Database | undefined
let auth: Auth | undefined

if (typeof window !== 'undefined') {
  try {
    app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    console.log('[v0] Firebase app initialized. databaseURL:', firebaseConfig.databaseURL || '(none)')
  } catch (error) {
    console.error('[v0] Firebase app initialization error:', error)
  }

  // Initialize the Realtime Database separately so a bad URL doesn't block auth
  if (app) {
    try {
      if (firebaseConfig.databaseURL) {
        database = getDatabase(app)
        console.log('[v0] Firebase Realtime Database initialized')
      } else {
        console.warn('[v0] NEXT_PUBLIC_FIREBASE_DATABASE_URL is missing - realtime sync disabled')
      }
    } catch (error) {
      console.error('[v0] Firebase Realtime Database error (check NEXT_PUBLIC_FIREBASE_DATABASE_URL):', error)
    }

    try {
      auth = getAuth(app)
    } catch (error) {
      console.error('[v0] Firebase Auth error:', error)
    }
  }
}

export { database, auth, app }
