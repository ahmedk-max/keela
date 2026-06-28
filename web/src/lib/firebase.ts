import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// The Firebase web config is NOT a secret — it only identifies the project. The real
// gate is Google Auth + Firestore rules locked to the owner UID (see firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyBskM3Cdh7taEwaTfJfi7f_B9HTQcWcuUE',
  authDomain: 'keela-finance.firebaseapp.com',
  projectId: 'keela-finance',
  storageBucket: 'keela-finance.firebasestorage.app',
  messagingSenderId: '783421311442',
  appId: '1:783421311442:web:01b8174f8415580655e00b',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Account allowlist — the CLIENT-side gate. The real, server-enforced lock is
// firestore.rules (owner UID): no other account can read/write the data regardless
// of this list. This list just rejects non-owner sign-ins cleanly in the UI instead
// of letting a stranger authenticate and hang on a permission-denied blank app.
// Add an email here to grant access. Keep lowercase.
export const ALLOWED_EMAILS = ['classicd3v@gmail.com']
export const isAllowedUser = (u: { email?: string | null } | null) =>
  !!u && ALLOWED_EMAILS.includes((u.email || '').toLowerCase())
