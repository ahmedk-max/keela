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
