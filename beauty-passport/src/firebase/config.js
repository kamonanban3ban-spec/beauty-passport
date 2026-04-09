import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey:            "AIzaSyDVokVt0ffoJCSYPO7irnq4WPxp22jSbNA",
  authDomain:        "hairpassport-4e7d3.firebaseapp.com",
  projectId:         "hairpassport-4e7d3",
  storageBucket:     "hairpassport-4e7d3.firebasestorage.app",
  messagingSenderId: "156636960375",
  appId:             "1:156636960375:web:bcec466987a9ab9ba61872",
  measurementId:     "G-WHNQ5FPPFX",
}

const app = initializeApp(firebaseConfig)

export const db      = getFirestore(app)
export const storage = getStorage(app)
