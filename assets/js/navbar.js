// navbar.js
import { auth } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  // Load navbar
  fetch("navbar.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("navbar").innerHTML = html;

      const loginLink = document.getElementById("loginLink");
      const registerLink = document.getElementById("registerLink");
      const welcomeMsg = document.getElementById("welcomeMsg");
      const logoutLink = document.getElementById("logoutLink");

      // Listen to Firebase auth state
      onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified) {
          // Show welcome + logout
          const username = user.email.split("@")[0];
          welcomeMsg.textContent = `Welcome, ${username}`;
          welcomeMsg.style.display = "inline";
          logoutLink.style.display = "inline";
          loginLink.style.display = "none";
          registerLink.style.display = "none";
        } else {
          // Show login/register
          welcomeMsg.style.display = "none";
          logoutLink.style.display = "none";
          loginLink.style.display = "inline";
          registerLink.style.display = "inline";
        }
      });

      // Logout handler
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await signOut(auth); // log out Firebase user
          localStorage.removeItem("user"); // optional
          location.reload(); // refresh to update navbar
        });
      }
    });
});
