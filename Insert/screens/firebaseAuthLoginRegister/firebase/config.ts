import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";
// Note: getAnalytics removed because it requires 'window' object which doesn't exist in React Native

// Optionally import the services that you want to use
// import {...} from 'firebase/auth';
// import {...} from 'firebase/database';
// import {...} from 'firebase/firestore';
// import {...} from 'firebase/functions';
// import {...} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDIC_L8g0bXbZLztgrvzpNtVxn7TZQu96A",
  authDomain: "planty-223aa.firebaseapp.com",
  projectId: "planty-223aa",
  storageBucket: "planty-223aa.firebasestorage.app",
  messagingSenderId: "1052731937623",
  appId: "1:1052731937623:web:35f0e850aa655406c6a412",
  measurementId: "G-CRXWNQ3BLX"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
