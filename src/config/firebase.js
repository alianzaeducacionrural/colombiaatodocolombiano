import { initializeApp } from "firebase/app"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyDjkHVwRpoZqVqX6PNoqKy5El6wylVxmKM",
  authDomain: "colombiaatodocolombiano.firebaseapp.com",
  databaseURL: "https://colombiaatodocolombiano-default-rtdb.firebaseio.com",
  projectId: "colombiaatodocolombiano",
  storageBucket: "colombiaatodocolombiano.firebasestorage.app",
  messagingSenderId: "842417552077",
  appId: "1:842417552077:web:7e4b0c7778f86f10a3c784"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
