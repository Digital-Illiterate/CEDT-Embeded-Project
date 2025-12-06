// src/lib/firebase.ts

import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

// 1. Get your config from the Firebase Console (Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyC8T3UFDrfpUAvO2o4KsaCQICCzZ1HAL04",
  authDomain: "cedt-embed-project.firebaseapp.com",
  databaseURL: "https://cedt-embed-project-default-rtdb.asia-southeast1.firebasedatabase.app", // 👈 Crucial for RTDB
  projectId: "cedt-embed-project",
  storageBucket: "cedt-embed-project.firebasestorage.app",
  messagingSenderId: "672426048730",
  appId: "1:672426048730:web:6ffb84046814e68980f9e3"
};

// 2. Initialize Firebase, preventing re-initialization on hot-reload/server-side
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// 3. Export the Realtime Database instance
export const db = getDatabase(app);