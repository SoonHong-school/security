import { auth, db } from "/assets/js/firebaseConfig.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { requireRole } from "/assets/js/auth.js";

const tableBody = document.getElementById("bookingTableBody");

requireRole(["admin"])
  .then(async admin => {
    console.log("Admin logged in:", admin.email);

    // Fetch facilities
    const facilitiesSnap = await getDocs(collection(db, "facilities"));
    const facilityMap = {};
    facilitiesSnap.forEach(doc => {
      const data = doc.data();
      facilityMap[doc.id] = `${data.name} - ${data.location}`;
    });

    // Fetch bookings
    const snap = await getDocs(collection(db, "bookings"));
    tableBody.innerHTML = "";

    if (snap.empty) {
      tableBody.innerHTML = `<tr><td colspan="7" class="no-data">No bookings found</td></tr>`;
      return;
    }

    const now = new Date();

    snap.forEach(async docSnap => {
      const data = docSnap.data();
      const facilityName = facilityMap[data.facilityId] || data.facilityId;
      let currentStatus = data.status || "pending";

      // --- Auto mark as done if past booking ---
      const [startTime, endTime] = data.timeSlot.split("-"); // e.g., "09:00-10:00"
      const bookingEnd = new Date(`${data.date}T${endTime}:00`);
      if (now > bookingEnd && currentStatus !== "done") {
        await updateDoc(doc(db, "bookings", docSnap.id), { status: "done" });
        currentStatus = "done";
      }

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.userEmail}</td>
        <td>${facilityName}</td>
        <td>${data.date}</td>
        <td>${data.timeSlot}</td>
        <td>${data.notes || "-"}</td>
        <td>${data.createdAt?.toDate?.().toLocaleString() || "-"}</td>
        <td>
          <select class="statusSelect">
            <option value="pending" ${currentStatus === "pending" ? "selected" : ""}>Pending</option>
            <option value="accepted" ${currentStatus === "accepted" ? "selected" : ""}>Accepted</option>
            <option value="declined" ${currentStatus === "declined" ? "selected" : ""}>Declined</option>
            <option value="done" ${currentStatus === "done" ? "selected" : ""}>Done</option>
          </select>
        </td>
      `;

      row.querySelector(".statusSelect").addEventListener("change", async e => {
        const newStatus = e.target.value;
        try {
          await updateDoc(doc(db, "bookings", docSnap.id), { status: newStatus });
          alert(`Status updated to ${newStatus}`);
        } catch (err) {
          console.error("Error updating status:", err);
          alert("Failed to update status.");
        }
      });

      tableBody.appendChild(row);
    });
  })
  .catch(err => {
    console.error("Access denied:", err);
    tableBody.innerHTML = `<tr><td colspan="7">Access Denied</td></tr>`;
  });
