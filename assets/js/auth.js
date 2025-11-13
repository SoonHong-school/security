import { auth } from "./firebaseConfig.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Prevent onAuthStateChanged from redirecting immediately after login
let justLoggedIn = false;

document.querySelectorAll(".toggle-password").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (target.type === "password") {
      target.type = "text";
      btn.textContent = "🙈"; // optional: change icon when visible
    } else {
      target.type = "password";
      btn.textContent = "👁️"; // back to eye icon
    }
  });
});


const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
  registerBtn.addEventListener("click", async () => {
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirm = document.getElementById("registerConfirm").value;

    // 1️⃣ Check password match
    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }

    // 2️⃣ Password strength check: at least 8 chars, letters + numbers
    const strongRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!strongRegex.test(password)) {
      alert("Password must be at least 8 characters and include both letters and numbers.");
      return;
    }

    try {
      // Firebase will hash password automatically — no need to hash manually
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send verification email
      await sendEmailVerification(user);

      alert("Registration successful! Please check your email to verify your account.");
      window.location.href = "login.html";

    } catch (error) {
      alert(error.message);
    }
  });
}

// ------------------ LOGIN ------------------
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (user.emailVerified) {
        alert("Login successful!");
        localStorage.setItem("user", JSON.stringify({ email: user.email }));

        // Set flag so onAuthStateChanged doesn't redirect immediately
        justLoggedIn = true;

        window.location.href = "index.html"; // or booking.html if that’s your main page
      } else {
        alert("Please verify your email before logging in.");
        await signOut(auth); // log out unverified user
      }

    } catch (error) {
      alert(error.message);
    }
  });
}

// ------------------ AUTH STATE CHANGE ------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (!user.emailVerified) {
      // If user is logged in but unverified
      alert("Please verify your email first!");
      signOut(auth);
      localStorage.removeItem("user");

      if (!window.location.pathname.endsWith("login.html")) {
        window.location.href = "login.html";
      }
    } else {
      // Verified user
      const path = window.location.pathname;

      // Only redirect if user is manually visiting login/register, and not just logged in
      if ((path.endsWith("login.html") || path.endsWith("register.html")) && !justLoggedIn) {
        window.location.href = "index.html";
      }
    }
  }
});

// Reset flag after page load
window.addEventListener("load", () => {
  justLoggedIn = false;
});
