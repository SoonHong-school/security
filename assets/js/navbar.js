import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  fetch("navbar.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("navbar").innerHTML = html;

      const loginLink = document.getElementById("loginLink");
      const registerLink = document.getElementById("registerLink");
      const welcomeMsg = document.getElementById("welcomeMsg");
      const logoutLink = document.getElementById("logoutLink");
      const logoutBtn = document.getElementById("logoutBtn");
      const userLinks = document.querySelectorAll(".user-link");

      let inactivityTimer;

      // Reset timer function
      function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(async () => {
          try {
            await signOut(auth);
            sessionStorage.removeItem("user");
            window.location.href = "login.html";
          } catch (err) {
            console.error("Auto logout failed:", err);
          }
        }, 5 * 60 * 1000); // 10 seconds for testing
      }

      // Attach activity listeners
      function attachActivityListeners() {
        ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
          document.addEventListener(event, resetInactivityTimer);
        });
      }

      // Firebase auth observer
      onAuthStateChanged(auth, async (user) => {
        if (user && user.emailVerified) {
          const username = user.email.split("@")[0];
          welcomeMsg.querySelector("span").textContent = `Welcome, ${username}`;
          welcomeMsg.style.display = "list-item";
          logoutLink.style.display = "inline";
          loginLink.style.display = "none";
          registerLink.style.display = "none";

          const userSnap = await getDoc(doc(db, "users", user.uid));
          const role = userSnap.exists() ? userSnap.data().role : null;

          if (role === "admin") {
            window.location.href = "admin.html";
          } else if (role === "user") {
            userLinks.forEach(link => link.style.display = "inline");
          } else {
            userLinks.forEach(link => link.style.display = "none");
          }

          // Start the inactivity timer AFTER confirming user is logged in
          resetInactivityTimer();
          attachActivityListeners();

        } else {
          welcomeMsg.style.display = "none";
          logoutLink.style.display = "none";
          loginLink.style.display = "inline";
          registerLink.style.display = "inline";
          userLinks.forEach(link => link.style.display = "none");
        }
      });

      // Manual logout
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          await signOut(auth);
          sessionStorage.removeItem("user");
          location.reload();
        });
      }
    });
});