import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA1IgHHZldwUWtc0iRStpTnjpR-MTa4C-M",
  authDomain: "project-7556774815385486013.firebaseapp.com",
  projectId: "project-7556774815385486013",
  storageBucket: "project-7556774815385486013.firebasestorage.app",
  messagingSenderId: "199333752857",
  appId: "1:199333752857:web:05f5d9eae039f80f5f3a88",
  measurementId: "G-Y5S3YNCR00",
  databaseURL: "https://project-7556774815385486013-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
