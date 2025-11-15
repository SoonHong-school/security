import { auth, db } from "/assets/js/firebaseConfig.js";
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
  if (!btn) return;
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
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

if (registerBtn && agreeTermsCheckbox) {
  agreeTermsCheckbox.addEventListener("change", () => {
    registerBtn.disabled = !agreeTermsCheckbox.checked;
  });
}

// ----------------- Reset Error States -----------------
function resetErrors() {
  const errorMessages = document.querySelectorAll(".error-message");
  errorMessages.forEach(message => message.style.display = "none");

  const errorFields = document.querySelectorAll(".error");
  errorFields.forEach(field => field.classList.remove("error"));
}

// ----------------- Registration -----------------
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const emailField = document.getElementById("registerEmail");
    const passwordField = document.getElementById("registerPassword");
    const confirmField = document.getElementById("registerConfirm");

    if (!emailField || !passwordField || !confirmField || !agreeTermsCheckbox) return;

    const email = emailField.value.trim();
    const password = passwordField.value;
    const confirm = confirmField.value;

    resetErrors();

    let isValid = true;

    if (!validateEmail(email)) {
      emailField.classList.add("error");
      const el = document.getElementById("emailError");
      if (el) { el.innerText = "Please enter a valid email address."; el.style.display = "block"; }
      isValid = false;
    }

    if (password !== confirm) {
      confirmField.classList.add("error");
      const el = document.getElementById("confirmPasswordError");
      if (el) { el.innerText = "Passwords do not match!"; el.style.display = "block"; }
      isValid = false;
    }

    if (!validatePassword(password)) {
      passwordField.classList.add("error");
      const el = document.getElementById("passwordError");
      if (el) { el.innerText = "Password must be at least 8 characters with uppercase, lowercase, number, and symbol."; el.style.display = "block"; }
      isValid = false;
    }

    if (!agreeTermsCheckbox.checked) {
      const el = document.getElementById("termsError");
      if (el) { el.innerText = "You must agree to the Terms and Conditions and Privacy Policy."; el.style.display = "block"; }
      isValid = false;
    }

    if (!isValid) return;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        email: user.email,
        role: "user",
        verified: false,
        termsAccepted: true,
        createdAt: serverTimestamp()
      });

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
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const emailField = document.getElementById("loginEmail");
    const passwordField = document.getElementById("loginPassword");
    if (!emailField || !passwordField) return;

    const email = emailField.value.trim();
    const password = passwordField.value;

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
    if (user.emailVerified) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { verified: true }, { merge: true });
    }
  } catch (err) {
    console.error("Auth listener error:", err);
  }
});

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
      unsubscribe();
      if (!user) { window.location.href = "login.html"; return reject("Not logged in"); }

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

        const role = (data.role || "").toLowerCase();
        const allowed = allowedRoles.map(r => r.toLowerCase());

        // Optional role check:
        // if (!allowed.includes(role)) { alert("Access denied"); return reject("Access denied"); }

        resolve(user);

      } catch (err) {
        console.error("RBAC check failed:", err);
        reject(err);
      }
    });
  });
}
