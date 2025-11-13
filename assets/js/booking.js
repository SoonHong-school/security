import { auth, db } from "./firebaseConfig.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { addDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const bookBtn = document.getElementById("bookBtn");

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

bookBtn.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return alert("Please log in first");

  const facility = document.getElementById("facility").value;
  const date = document.getElementById("date").value;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;
  const notes = document.getElementById("notes").value;

  if (!date || !start || !end) return alert("Please fill all fields");

  const q = query(
    collection(db, "bookings"),
    where("facility", "==", facility),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  const overlap = snap.docs.some(d => {
    const b = d.data();
    return !(end <= b.startTime || start >= b.endTime);
  });
  if (overlap) return alert("Time slot already booked");

  await addDoc(collection(db, "bookings"), {
    userId: user.uid,
    userEmail: user.email,
    facility,
    date,
    startTime: start,
    endTime: end,
    notes,
  });
  alert("Booking confirmed!");
});
