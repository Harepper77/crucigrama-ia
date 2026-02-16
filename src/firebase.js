import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyGMm3cIZj7P9VJeNGjgrfh1dGGQMZTrcEeU",
  authDomain: "crucigrama-ia.firebaseapp.com",
  projectId: "crucigrama-ia",
  storageBucket: "crucigrama-ia.firebasestorage.app",
  messagingSenderId: "932268475582",
  appId: "1:932268475582:web:fe65c2ae41c2851d4c57cf",
  measurementId: "G-249VARZY9Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Analytics (opcional)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };