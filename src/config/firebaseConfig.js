import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCVvo534_wERd-lizjjxrexmiJmq9f7u3U",
  authDomain: "horta-f9a67.firebaseapp.com",
  databaseURL: "https://horta-f9a67-default-rtdb.firebaseio.com",
  projectId: "horta-f9a67",
  storageBucket: "horta-f9a67.firebasestorage.app",
  messagingSenderId: "987747480521",
  appId: "1:987747480521:web:730c0958401a295285ae18"
};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth };