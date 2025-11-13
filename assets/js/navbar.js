// assets/js/navbar.js

document.addEventListener("DOMContentLoaded", () => {
  // Load navbar
  fetch("navbar.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("navbar").innerHTML = html;

      // After loading navbar, check user state
      const user = JSON.parse(localStorage.getItem("user"));
      const loginLink = document.getElementById("loginLink");
      const registerLink = document.getElementById("registerLink");
      const welcomeMsg = document.getElementById("welcomeMsg");
      const logoutLink = document.getElementById("logoutLink");

      if (user && user.email) {
        // Extract name from email
        const username = user.email.split("@")[0];
        welcomeMsg.textContent = `Welcome, ${username}`;
        welcomeMsg.style.display = "inline";
        logoutLink.style.display = "inline";
        loginLink.style.display = "none";
        registerLink.style.display = "none";
      }

      // Logout handler
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
          e.preventDefault();
          localStorage.removeItem("user");
          window.location.href = "index.html";
        });
      }
    });
});
