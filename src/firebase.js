import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAYMxt-T0ns4QtZVJ-xMIX9XuyIxLv41NA",
  authDomain: "goodadvsbadad.firebaseapp.com",
  projectId: "goodadvsbadad",
  storageBucket: "goodadvsbadad.firebasestorage.app",
  messagingSenderId: "239870230988",
  appId: "1:239870230988:web:0e52e98186a3c639215d69"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
