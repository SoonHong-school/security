import { auth } from "./firebaseConfig.js";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Register
const registerBtn = document.getElementById("registerBtn");
if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            alert("Registration successful!");
            
            // Save user to localStorage
            localStorage.setItem("user", JSON.stringify({ email: user.email }));
            window.location.href = "booking.html";

        } catch (error) {
            alert(error.message);
        }
    });
}


// Login
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user; // <-- fix: get the logged-in user
            alert("Login successful!");
            
            // Save user to localStorage
            localStorage.setItem("user", JSON.stringify({ email: user.email }));
            window.location.href = "index.html"; // redirect after login

        } catch (error) {
            alert(error.message);
        }
    });
}


// Redirect logged-in users automatically
onAuthStateChanged(auth, (user) => {
    if (user && (window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("register.html"))) {
        window.location.href = "booking.html";
    }
});
