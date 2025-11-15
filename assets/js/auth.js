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
      return "Invalid email address. Please enter a valid email.";
    case "auth/weak-password":
      return "Password is too weak. Use 8+ chars with uppercase, lowercase, number, and symbol.";
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

// ----------------- Enable Register Button Only if Terms Accepted -----------------
const registerBtn = document.getElementById("registerBtn");
const agreeTermsCheckbox = document.getElementById("agreeTerms");

// Enable/disable the register button based on checkbox state
agreeTermsCheckbox.addEventListener("change", () => {
  registerBtn.disabled = !agreeTermsCheckbox.checked;
});

// ----------------- Reset Error States -----------------
function resetErrors() {
  const errorMessages = document.querySelectorAll(".error-message");
  errorMessages.forEach(message => {
    message.style.display = "none";
  });

  const errorFields = document.querySelectorAll(".error");
  errorFields.forEach(field => {
    field.classList.remove("error");
  });
}

// ----------------- Registration -----------------
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirm = document.getElementById("registerConfirm").value;

    // Reset errors before starting validation
    resetErrors();

    // Validation checks
    let isValid = true;

    // Email validation
    if (!validateEmail(email)) {
      document.getElementById("registerEmail").classList.add("error");
      document.getElementById("emailError").innerText = "Please enter a valid email address.";
      document.getElementById("emailError").style.display = "block";
      isValid = false;
    }

    // Password matching check
    if (password !== confirm) {
      document.getElementById("registerConfirm").classList.add("error");
      document.getElementById("confirmPasswordError").innerText = "Passwords do not match!";
      document.getElementById("confirmPasswordError").style.display = "block";
      isValid = false;
    }

    // Password strength validation
    if (!validatePassword(password)) {
      document.getElementById("registerPassword").classList.add("error");
      document.getElementById("passwordError").innerText = "Password must be at least 8 characters with uppercase, lowercase, number, and symbol.";
      document.getElementById("passwordError").style.display = "block";
      isValid = false;
    }

    // Terms and Conditions agreement check
    if (!agreeTermsCheckbox.checked) {
      document.getElementById("termsError").innerText = "You must agree to the Terms and Conditions and Privacy Policy.";
      document.getElementById("termsError").style.display = "block";
      isValid = false;
    }

    if (!isValid) {
      return; // Prevent form submission if validation failed
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1️⃣ Create Firestore user document BEFORE email verification
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          email: user.email,
          role: "user", // Default role
          verified: false, // User is not verified yet
          termsAccepted: true, // Track that the user agreed to the terms
          createdAt: serverTimestamp() // Timestamp for user creation
        });
        console.log("Firestore user document created:", user.uid);
      } catch (firestoreError) {
        console.error("Firestore user creation failed:", firestoreError);
        alert("User was registered but failed to create Firestore document.");
        return; // Stop — do not continue
      }

      // 2️⃣ THEN send verification email
      await sendEmailVerification(user);

      // Show success message and redirect
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

