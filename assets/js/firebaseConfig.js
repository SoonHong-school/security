import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCr3XpKGagcyRErNPGE3goPpV4P7UmKY8s",
  authDomain: "security-b3ff5.firebaseapp.com",
  projectId: "security-b3ff5",
  storageBucket: "security-b3ff5.firebasestorage.app",
  messagingSenderId: "264611221431",
  appId: "1:264611221431:web:eac9dec478c929a577a232",
  measurementId: "G-0LSYKEN3G2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Expose to global scope for console access
window._auth = auth;
