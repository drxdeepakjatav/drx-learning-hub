/* =========================================================
   DRx LEARNING HUB - ADMIN: NOTIFICATIONS
   Collection: notifications
   Fields: text, link, active, expiresAt (optional), createdAt
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var form = document.getElementById("noticeForm");
    var editingId = document.getElementById("editingId");
    var textInput = document.getElementById("noticeText");
    var linkInput = document.getElementById("noticeLink");
    var untilInput = document.getElementById("noticeUntil");
    var activeInput = document.getElementById("noticeActive");
    var saveBtn = document.getElementById("saveBtn");
    var cancelBtn = document.getElementById("cancelBtn");
    var formTitle = document.getElementById("formTitle");
    var message = document.getElementById("noticeMessage");
    var list = document.getElementById("noticeList");
    var empty = document.getElementById("noNotices");
    var logoutBtn = document.getElementById("logoutBtn");

    var currentAdmin = null;
    var notices = [];


    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showMessage(text, ok) {
        message.style.display = "block";
        message.className = "alert " + (ok ? "success" : "alert-error");
        message.textContent = text;
        message.style.opacity = "1";
    }

    function dateText(ts) {

        if (!ts || !ts.toDate) return "";

        return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }

    function dateInputValue(ts) {

        if (!ts || !ts.toDate) return "";

        var d = ts.toDate();

        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }


    /* ================= AUTH ================= */

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

            currentAdmin = user;

            await loadNotices();

        } catch (error) {
            console.error(error);
            alert("Unable to verify admin account.");
        }
    });


    /* ================= LIST ================= */

    async function loadNotices() {

        try {

            var snapshot = await db.collection("notifications").get();

            notices = [];

            snapshot.forEach(function (doc) {
                notices.push(Object.assign({ id: doc.id }, doc.data()));
            });

            notices.sort(function (a, b) {
                var at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                var bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                return bt - at;
            });

            render();

        } catch (error) {

            console.error(error);

            list.innerHTML =
                '<div class="alert alert-error">Unable to load notifications. ' + esc(error.message) + "</div>";
        }
    }

    function render() {

        list.innerHTML = "";

        if (!notices.length) {
            empty.style.display = "block";
            return;
        }

        empty.style.display = "none";

        var now = Date.now();

        notices.forEach(function (n) {

            var expired = n.expiresAt && n.expiresAt.toMillis && n.expiresAt.toMillis() < now;

            var live = n.active !== false && !expired;

            var card = document.createElement("div");

            card.className = "card";

            card.innerHTML =
                '<div class="card-body">' +
                    '<p style="font-size:16px;color:#111827;font-weight:600;">' + esc(n.text) + "</p>" +
                    "<p><strong>Status:</strong> " +
                        (live ? "✅ Showing on website"
                              : (expired ? "⏰ Expired" : "🙈 Hidden")) + "</p>" +
                    (n.link ? "<p><strong>Link:</strong> " + esc(n.link) + "</p>" : "") +
                    (n.expiresAt ? "<p><strong>Show until:</strong> " + esc(dateText(n.expiresAt)) + "</p>" : "") +
                    '<div class="button-group" style="margin-top:12px;">' +
                        '<button class="btn btn-primary edit-notice" data-id="' + esc(n.id) + '" type="button">Edit</button>' +
                        '<button class="btn btn-secondary toggle-notice" data-id="' + esc(n.id) + '" type="button">' +
                            (n.active !== false ? "Hide" : "Show") + "</button>" +
                        '<button class="btn btn-danger delete-notice" data-id="' + esc(n.id) + '" type="button">Delete</button>' +
                    "</div>" +
                "</div>";

            list.appendChild(card);
        });
    }


    /* ================= SAVE ================= */

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (!currentAdmin) return;

        var text = textInput.value.trim();
        var link = linkInput.value.trim();
        var until = untilInput.value;
        var active = activeInput.value === "true";
        var id = editingId.value;

        if (!text) {
            showMessage("Please write the notification text.", false);
            return;
        }

        if (link && !/^(https?:\/\/|[\w\-./]+)/i.test(link)) {
            showMessage("The link must start with https:// or be a page like courses.html.", false);
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = id ? "Updating..." : "Adding...";

        try {

            var stamp = firebase.firestore.FieldValue.serverTimestamp();

            var data = {
                text: text,
                link: link,
                active: active,
                updatedAt: stamp
            };

            if (until) {
                data.expiresAt = firebase.firestore.Timestamp.fromDate(new Date(until + "T23:59:59"));
            } else if (id) {
                data.expiresAt = firebase.firestore.FieldValue.delete();
            }

            if (id) {

                await db.collection("notifications").doc(id).update(data);

                showMessage("Notification updated.", true);

            } else {

                data.createdAt = stamp;
                data.createdBy = currentAdmin.uid;

                await db.collection("notifications").add(data);

                showMessage("Notification added. It will appear on the website shortly.", true);
            }

            resetForm();

            await loadNotices();

        } catch (error) {

            console.error(error);

            showMessage("Could not save: " + error.message, false);

        } finally {

            saveBtn.disabled = false;
            saveBtn.textContent = editingId.value ? "Update Notification" : "Add Notification";
        }
    });


    /* ================= EDIT / SHOW-HIDE / DELETE ================= */

    list.addEventListener("click", async function (event) {

        var edit = event.target.closest(".edit-notice");
        var toggle = event.target.closest(".toggle-notice");
        var del = event.target.closest(".delete-notice");

        if (edit) {

            var n = notices.filter(function (x) { return x.id === edit.dataset.id; })[0];

            if (!n) return;

            editingId.value = n.id;
            textInput.value = n.text || "";
            linkInput.value = n.link || "";
            untilInput.value = dateInputValue(n.expiresAt);
            activeInput.value = n.active === false ? "false" : "true";

            formTitle.textContent = "Edit Notification";
            saveBtn.textContent = "Update Notification";
            cancelBtn.style.display = "inline-block";

            window.scrollTo({ top: 0, behavior: "smooth" });

            return;
        }

        if (toggle) {

            var item = notices.filter(function (x) { return x.id === toggle.dataset.id; })[0];

            if (!item) return;

            try {

                await db.collection("notifications").doc(item.id).update({
                    active: item.active === false
                });

                await loadNotices();

            } catch (error) {

                console.error(error);

                showMessage("Could not change status: " + error.message, false);
            }

            return;
        }

        if (del) {

            if (!confirm("Delete this notification?")) return;

            try {

                await db.collection("notifications").doc(del.dataset.id).delete();

                showMessage("Notification deleted.", true);

                await loadNotices();

            } catch (error) {

                console.error(error);

                showMessage("Could not delete: " + error.message, false);
            }
        }
    });

    cancelBtn.addEventListener("click", resetForm);

    function resetForm() {

        form.reset();

        editingId.value = "";

        formTitle.textContent = "Add New Notification";
        saveBtn.textContent = "Add Notification";
        cancelBtn.style.display = "none";
    }


    /* ================= LOGOUT ================= */

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
