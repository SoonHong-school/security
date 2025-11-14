// navbar.js
import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Load navbar HTML
  fetch("navbar.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("navbar").innerHTML = html;

      const loginLink = document.getElementById("loginLink");
      const registerLink = document.getElementById("registerLink");
      const welcomeMsg = document.getElementById("welcomeMsg");
      const logoutLink = document.getElementById("logoutLink");
      const adminLinks = document.querySelectorAll(".admin-link"); // Add class="admin-link" in navbar.html for admin-only links
      const userLinks = document.querySelectorAll(".user-link");   // Add class="user-link" for user-only links

      onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
          // Show welcome + logout
          const username = user.email.split("@")[0];
          welcomeMsg.textContent = `Welcome, ${username}`;
          welcomeMsg.style.display = "inline";
          logoutLink.style.display = "inline";
          loginLink.style.display = "none";
          registerLink.style.display = "none";

          // Fetch user role from Firestore
          const userSnap = await getDoc(doc(db, "users", user.uid));
          const role = userSnap.exists() ? userSnap.data().role : null;

          // Show/hide links based on role
          if (role === "admin") {
            adminLinks.forEach(link => link.style.display = "inline");
            userLinks.forEach(link => link.style.display = "none");
          } else if (role === "user") {
            userLinks.forEach(link => link.style.display = "inline");
            adminLinks.forEach(link => link.style.display = "none");
          } else {
            // Unknown role, hide both
            adminLinks.forEach(link => link.style.display = "none");
            userLinks.forEach(link => link.style.display = "none");
          }

        } else {
          // Not logged in or unverified
          welcomeMsg.style.display = "none";
          logoutLink.style.display = "none";
          loginLink.style.display = "inline";
          registerLink.style.display = "inline";
          adminLinks.forEach(link => link.style.display = "none");
          userLinks.forEach(link => link.style.display = "none");
        }
      });

      // Logout handler
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await signOut(auth);
          sessionStorage.removeItem("user"); // optional
          location.reload(); // refresh to update navbar
        });
      }
    });
});
