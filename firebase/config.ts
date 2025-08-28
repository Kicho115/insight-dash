import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCknmcjiKWtVkLlQ6t_JkuWu8fXEgnbM50",
  authDomain: "insight-dash.firebaseapp.com",
  projectId: "insight-dash",
  storageBucket: "insight-dash.firebasestorage.app",
  messagingSenderId: "811846802264",
  appId: "1:811846802264:web:19e31fd15c029df349a32d",
  measurementId: "G-RFHQSR0CK8",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export firebase services instances
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
