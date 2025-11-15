import { auth, db } from "/assets/js/firebaseConfig.js";
import { 
  collection, getDocs, addDoc, query, where 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { requireRole } from "/assets/js/auth.js";

const form = document.getElementById("bookingForm");
const facilitySelect = document.getElementById("facility");
const dateInput = document.getElementById("date");
const timeSlotSelect = document.getElementById("timeSlot");

const timeSlots = [
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00"
];

// ---------- Render Time Slots ----------
function renderTimeSlots(booked = []) {
  timeSlotSelect.innerHTML = `
    <option value="" disabled selected>Select a time slot</option>
  `;

  timeSlots.forEach(slot => {
    const option = document.createElement("option");
    option.value = slot;
    option.textContent = slot.replace("-", " - ");

    if (booked.includes(slot)) {
      option.disabled = true;
      option.style.color = "#777";
      option.style.background = "#eee";
    }

    timeSlotSelect.appendChild(option);
  });
}

// ---------- Fetch Booked Slots ----------
async function updateTimeSlots() {
  const facilityId = facilitySelect.value;
  const date = dateInput.value;

  if (!facilityId || !date) {
    renderTimeSlots();
    return;
  }

  try {
    const q = query(
      collection(db, "bookings"),
      where("facilityId", "==", facilityId),
      where("date", "==", date)
    );

    const snap = await getDocs(q);

    const bookedSlots = snap.docs.map(doc => doc.data().timeSlot);

    renderTimeSlots(bookedSlots); // grey-out
  } catch (err) {
    console.error("Error fetching booked slots:", err);
  }
}

// ---------- Main ----------
requireRole(["user"])
  .then(async user => {
    console.log("User authorized:", user.email);

    // Load facilities
    const facilitiesSnap = await getDocs(collection(db, "facilities"));
    facilitiesSnap.forEach(doc => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = `${data.name} - ${data.location}`;
      facilitySelect.appendChild(option);
    });

    // Set minimum date (3 days ahead)
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 3);
    dateInput.min = minDate.toISOString().split("T")[0];

    // Listeners
    facilitySelect.addEventListener("change", updateTimeSlots);
    dateInput.addEventListener("change", updateTimeSlots);

    // First render
    renderTimeSlots();

    // ---------- Submit Booking ----------
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const facilityId = facilitySelect.value;
      const date = dateInput.value;
      const timeSlot = timeSlotSelect.value;
      const notes = document.getElementById("notes").value;

      if (!facilityId || !date || !timeSlot)
        return alert("Please fill all required fields.");

      const [startTime, endTime] = timeSlot.split("-");

      const bookingData = {
        userId: user.uid,
        userEmail: user.email,
        facilityId,
        date,
        timeSlot,
        startTime,
        endTime,
        notes,
        createdAt: new Date()
      };

      try {
        // Save to user bookings
        await addDoc(collection(db, "users", user.uid, "bookings"), bookingData);

        // Save to public bookings
        await addDoc(collection(db, "bookings"), bookingData);

        alert("Booking confirmed!");
        form.reset();
        updateTimeSlots(); // refresh slots after booking
      } catch (err) {
        console.error("Error saving booking:", err);
        alert("Error saving booking. Try again.");
      }
    });
  })
  .catch(err => {
    console.error("Access denied:", err);
    document.getElementById("userContent").style.display = "none";
    document.getElementById("accessDenied").style.display = "block";
  });
