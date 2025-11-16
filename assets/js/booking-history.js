import { auth, db } from "/assets/js/firebaseConfig.js";
import { requireRole } from "/assets/js/auth.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const tbody = document.getElementById("bookingHistory");

// Ensure DOM element exists
if (!tbody) {
  console.warn("booking-history.js: #bookingHistory element not found.");
} else {
  // Only allow verified users (same pattern as your booking.js)
  requireRole(["user"])
    .then(async user => {
      try {
        // 1) Load facilities to map id -> "Name - Location"
        const facilitySnap = await getDocs(collection(db, "facilities"));
        const facilityMap = {};
        facilitySnap.forEach(fDoc => {
          const d = fDoc.data();
          facilityMap[fDoc.id] = `${d.name}${d.location ? " - " + d.location : ""}`;
        });

        // 2) Query user's bookings (most recent first)
        // We use orderBy("date", "desc") then rely on client-side sorting for time if needed
        const q = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          orderBy("date", "desc")
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          tbody.innerHTML = `<tr><td colspan="5" class="no-data">No bookings found.</td></tr>`;
          return;
        }

        // Clear existing rows
        tbody.innerHTML = "";

        // Render each booking row
        snap.forEach(docSnap => {
          const data = docSnap.data();

          // facility name fallback
          const facilityText = facilityMap[data.facilityId] || data.facilityId || "Unknown facility";

          // format createdAt: Firestore Timestamp -> Date string; also accept Date or string
          let createdAtText = "-";
          if (data.createdAt) {
            try {
              if (typeof data.createdAt.toDate === "function") {
                createdAtText = data.createdAt.toDate().toLocaleString();
              } else {
                createdAtText = new Date(data.createdAt).toLocaleString();
              }
            } catch (err) {
              createdAtText = String(data.createdAt);
            }
          }

          // nice status text (capitalize)
          const status = (data.status || "pending").toString();
          const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${escapeHtml(facilityText)}</td>
            <td>${escapeHtml(data.date || "-")}</td>
            <td>${escapeHtml(data.timeSlot || "-")}</td>
            <td class="status-${escapeHtml(status)}">${escapeHtml(statusLabel)}</td>
            <td>${escapeHtml(data.notes || "-")}</td>
          `;

          // optionally add a small meta column (created at) as a title attribute for the row
          row.title = `Booked on: ${createdAtText}`;

          tbody.appendChild(row);
        });

      } catch (err) {
        console.error("Error loading booking history:", err);
        tbody.innerHTML = `<tr><td colspan="5" class="no-data">Error loading history.</td></tr>`;
      }
    })
    .catch(err => {
      console.error("Access denied (booking history):", err);
      tbody.innerHTML = `<tr><td colspan="5" class="no-data">Access denied. Please login / verify email.</td></tr>`;
    });
}

// Small helper to avoid injecting raw HTML (basic sanitization)
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
