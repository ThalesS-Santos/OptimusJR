// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAcq9CW4YvZJB9DHoiwgKD3tIYABj2Q7bI",
  authDomain: "optimusjr-banco.firebaseapp.com",
  projectId: "optimusjr-banco",
  storageBucket: "optimusjr-banco.firebasestorage.app",
  messagingSenderId: "1085244384785",
  appId: "1:1085244384785:web:f3139fbcff7653407173b0",
  measurementId: "G-PV4TWJD94Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const provider = new GoogleAuthProvider();
