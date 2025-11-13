import { auth, db } from "./firebaseConfig.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const bookingList = document.getElementById("bookingList");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  const q = query(collection(db, "bookings"), where("userId", "==", user.uid));
  const snap = await getDocs(q);

  if (snap.empty) {
    bookingList.innerHTML = "<p>No bookings yet.</p>";
    return;
  }

  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const div = document.createElement("div");
    div.style.borderBottom = "1px solid #ddd";
    div.style.padding = "10px 0";
    div.innerHTML = `
      <strong>${d.facility}</strong><br>
      ${d.date} | ${d.startTime} - ${d.endTime}<br>
      <em>${d.notes || ""}</em><br>
      <button data-id="${docSnap.id}" class="cancelBtn">Cancel</button>
    `;
    bookingList.appendChild(div);
  });

  document.querySelectorAll(".cancelBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Cancel this booking?")) {
        await deleteDoc(doc(db, "bookings", btn.dataset.id));
        alert("Booking cancelled");
        window.location.reload();
      }
    });
  });
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});
