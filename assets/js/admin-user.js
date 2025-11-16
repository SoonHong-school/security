import { auth, db } from "/assets/js/firebaseConfig.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { requireRole } from "/assets/js/auth.js";

// Ensure only admins can access
requireRole(["admin"])
    .then(loadUsers)
    .catch(() => {
        document.body.innerHTML = "<h2>Access Denied</h2>";
    });

async function loadUsers() {
    const table = document.getElementById("usersTableBody");
    table.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

    const usersSnap = await getDocs(collection(db, "users"));

    if (usersSnap.empty) {
        table.innerHTML = "<tr><td colspan='6'>No users found.</td></tr>";
        return;
    }

    table.innerHTML = "";

    usersSnap.forEach(userDoc => {
        const data = userDoc.data();
        const id = userDoc.id;

        const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleString()
            : "N/A";

        const row = document.createElement("tr");
        row.innerHTML = `
      <td>${data.email}</td>
      <td>
        <select data-id="${id}" class="roleSelect">
          <option value="user" ${data.role === "user" ? "selected" : ""}>User</option>
          <option value="admin" ${data.role === "admin" ? "selected" : ""}>Admin</option>
        </select>
      </td>
      <td>${data.verified ? "Yes" : "No"}</td>
      <td>${data.banned ? "Yes" : "No"}</td>
      <td>${createdAt}</td>
      <td>
        <button class="banBtn" data-id="${id}">${data.banned ? "Unban" : "Ban"}</button>
      </td>
    `;

        table.appendChild(row);
    });

    attachEvents();
}

function attachEvents() {
    // Change role
    document.querySelectorAll(".roleSelect").forEach(select => {
        select.addEventListener("change", async (e) => {
            const userId = e.target.dataset.id;
            const newRole = e.target.value;

            await updateDoc(doc(db, "users", userId), { role: newRole });
            alert("Role updated!");
        });
    });

    // Ban / Unban user
    document.querySelectorAll(".banBtn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const userId = e.target.dataset.id;
            const currentStatus = btn.textContent === "Unban"; // if true, user is banned

            const confirmMsg = currentStatus
                ? "Are you sure you want to unban this user?"
                : "Are you sure you want to ban this user? They will not be able to make new bookings.";

            if (!confirm(confirmMsg)) return;

            try {
                await updateDoc(doc(db, "users", userId), { banned: !currentStatus });
                alert(currentStatus ? "User unbanned!" : "User banned successfully!");
                loadUsers();
            } catch (err) {
                console.error("Error updating ban status:", err);
                alert("Error updating ban status. Check console for details.");
            }
        });
    });
}
