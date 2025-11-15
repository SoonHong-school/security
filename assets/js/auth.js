// auth.js
import { auth, db } from "./firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// ----------------- Helpers -----------------
export function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[^\s]{8,}$/;
  return regex.test(password);
}

export function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function getFriendlyErrorMessage(code) {
  switch (code) {
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/invalid-email":
      return "Invalid email address.";
    case "auth/weak-password":
      return "Password is too weak. Use 8+ chars with letters, numbers, and symbols.";
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Incorrect email or password.";
    default:
      return "An unexpected error occurred. Please check the console for details.";
  }
}

// ----------------- Password Toggle -----------------
document.querySelectorAll(".toggle-password").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (target.type === "password") {
      target.type = "text";
      btn.textContent = "🙈";
    } else {
      target.type = "password";
      btn.textContent = "👁️";
    }
  });
});

// ----------------- Registration -----------------
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirm = document.getElementById("registerConfirm").value;

    if (!validateEmail(email)) return alert("Please enter a valid email address.");
    if (password !== confirm) return alert("Passwords do not match!");
    if (!validatePassword(password)) return alert("Password must be 8+ chars with uppercase, lowercase, number, and symbol.");

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1️⃣ Create Firestore user document BEFORE email verification
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          email: user.email,
          role: "user",
          verified: false,
          createdAt: serverTimestamp()
        });
        console.log("Firestore user document created:", user.uid);
      } catch (firestoreError) {
        console.error("Firestore user creation failed:", firestoreError);
        alert("User was registered but failed to create Firestore document.");
        return; // Stop — do not continue
      }

      // 2️⃣ THEN send verification email
      await sendEmailVerification(user);

      alert("Registration successful! Please check your email to verify your account.");
      window.location.href = "login.html";

    } catch (error) {
      console.error("Registration error:", error);
      alert(getFriendlyErrorMessage(error.code));
    }
  });
}

// ----------------- Login -----------------
let justLoggedIn = false;
const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!validateEmail(email)) return alert("Please enter a valid email address.");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        alert("Please verify your email before logging in.");
        await signOut(auth);
        return;
      }

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { verified: true }, { merge: true });

      sessionStorage.setItem("user", JSON.stringify({ email: user.email, uid: user.uid }));
      justLoggedIn = true;
      window.location.href = "index.html";

    } catch (error) {
      console.error("Login error:", error);
      alert(getFriendlyErrorMessage(error.code));
    }
  });
}

// ----------------- Auth State Listener -----------------
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const path = window.location.pathname;

    // Only update verification status if logged in
    if (user.emailVerified) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { verified: true }, { merge: true });
    }

  } catch (err) {
    console.error("Auth listener error:", err);
  }
});


window.addEventListener("load", () => { justLoggedIn = false; });

// ----------------- Logout -----------------
export async function logout() {
  await signOut(auth);
  sessionStorage.removeItem("user");
  window.location.href = "login.html";
}

// ----------------- Role-based Access -----------------
export async function requireRole(allowedRoles = []) {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // stop listening once fired

      if (!user) {
        window.location.href = "login.html";
        return reject("Not logged in");
      }

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (!userSnap.exists()) {
          await signOut(auth);
          window.location.href = "login.html";
          return reject("User profile not found");
        }

        const data = userSnap.data();

        // Make sure verified flag is boolean
        if (!data.verified) {
          alert("Please verify your email first!");
          await signOut(auth);
          window.location.href = "login.html";
          return reject("Email not verified");
        }

        // ✅ Safe role check
        const role = (data.role || "").toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());

 //       if (!allowed.includes(role)) {
 //         alert("Access denied: insufficient permissions");
 //         window.location.href = "index.html";
//          return reject("Access denied");
 //       }

        resolve(user); // authorized
      } catch (err) {
        console.error("RBAC check failed:", err);
        reject(err);
      }
    });
  });
}

