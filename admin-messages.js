/* =========================================================
   DRx LEARNING HUB - ADMIN: CONTACT MESSAGES
   Collection: contactMessages
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var statusBox = document.getElementById("msgStatus");
    var list = document.getElementById("msgList");
    var logoutBtn = document.getElementById("logoutBtn");


    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatDate(ts) {

        if (!ts || !ts.toDate) return "";

        return ts.toDate().toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    }


    auth.onAuthStateChanged(async function (user) {

        if (!user) {
            window.location.href = "admin-login.html";
            return;
        }

        try {

            var adminDoc = await db.collection("admins").doc(user.uid).get();

            if (!adminDoc.exists || adminDoc.data().role !== "admin") {
                await auth.signOut();
                alert("Access denied. Admin account required.");
                window.location.href = "admin-login.html";
                return;
            }

            loadMessages();

        } catch (error) {
            console.error(error);
            alert("Unable to verify admin account.");
        }
    });


    async function loadMessages() {

        try {

            var snapshot = await db
                .collection("contactMessages")
                .orderBy("createdAt", "desc")
                .get();

            list.innerHTML = "";

            if (snapshot.empty) {
                statusBox.innerHTML = "<h3>No messages yet</h3><p>New messages will appear here.</p>";
                return;
            }

            statusBox.style.display = "none";

            snapshot.forEach(function (doc) {

                var m = doc.data();

                var card = document.createElement("div");

                card.className = "card";

                card.innerHTML =
                    '<div class="card-body">' +
                        "<h3>" + esc(m.subject || "Message") + "</h3>" +
                        "<p><strong>" + esc(m.name) + "</strong> &lt;" +
                            '<a href="mailto:' + esc(m.email) + '">' + esc(m.email) + "</a>&gt;</p>" +
                        '<p style="color:#6b7280;font-size:13px;">' + esc(formatDate(m.createdAt)) + "</p>" +
                        '<p style="white-space:pre-wrap;margin-top:10px;">' + esc(m.message) + "</p>" +
                        '<div class="button-group" style="margin-top:14px;">' +
                            '<a class="btn btn-primary" href="mailto:' + esc(m.email) +
                                "?subject=" + encodeURIComponent("Re: " + (m.subject || "Your message")) +
                                '">Reply</a>' +
                            '<button class="btn btn-danger delete-msg" data-id="' + esc(doc.id) +
                                '" type="button">Delete</button>' +
                        "</div>" +
                    "</div>";

                list.appendChild(card);
            });

        } catch (error) {

            console.error(error);

            statusBox.innerHTML =
                '<div class="alert alert-error">Unable to load messages. ' + esc(error.message) + "</div>";
        }
    }


    list.addEventListener("click", async function (event) {

        var btn = event.target.closest(".delete-msg");

        if (!btn) return;

        if (!confirm("Delete this message?")) return;

        try {

            await db.collection("contactMessages").doc(btn.dataset.id).delete();

            btn.closest(".card").remove();

        } catch (error) {

            console.error(error);

            alert("Failed to delete: " + error.message);
        }
    });


    logoutBtn.addEventListener("click", async function () {

        try {

            await auth.signOut();

            window.location.href = "admin-login.html";

        } catch (error) {

            console.error(error);

            alert("Logout failed.");
        }
    });

});
