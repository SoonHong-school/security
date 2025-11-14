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
      return "An unexpected error occurred. Please try again.";
  }
}

export async function logEvent(uid, action) {
  try {
    await addDoc(collection(db, "logs"), {
      uid,
      action,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to log event:", err);
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

      // Send email verification
      await sendEmailVerification(user);

      // Create Firestore user document
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        email: user.email,
        role: "user",           // default role
        verified: false,        // updated after verification
        createdAt: serverTimestamp()
      });

      await logEvent(user.uid, "register");

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

      // Update Firestore verification
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { verified: true }, { merge: true });

      await logEvent(user.uid, "login");

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

    if (!user.emailVerified) {
      alert("Please verify your email first!");
      await signOut(auth);
      sessionStorage.removeItem("user");
      if (!path.endsWith("login.html")) window.location.href = "login.html";
      return;
    }

    // Ensure Firestore 'verified' field is updated
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { verified: true }, { merge: true });

    // Redirect away from login/register if already logged in
    if ((path.endsWith("login.html") || path.endsWith("register.html")) && !justLoggedIn) {
      window.location.href = "index.html";
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
    onAuthStateChanged(auth, async (user) => {
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

        if (!data.verified) {
          alert("Please verify your email first!");
          await signOut(auth);
          window.location.href = "login.html";
          return reject("Email not verified");
        }

        if (!allowedRoles.includes(data.role)) {
          alert("Access denied: insufficient permissions");
          window.location.href = data.role === "admin" ? "admin.html" : "index.html";
          return reject("Access denied");
        }

        resolve(user); // authorized
      } catch (err) {
        console.error("RBAC check failed:", err);
        reject(err);
      }
    });
  });
}
