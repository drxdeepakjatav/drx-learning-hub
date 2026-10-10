/* =========================================================
   DRx LEARNING HUB - ADMIN: ENROLLMENT REQUESTS
   Collection: enrollmentRequests  (id = studentId_courseId)
   Approve = same result as Admin > Enrollments
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var statusBox = document.getElementById("reqStatus");
    var list = document.getElementById("reqList");
    var banner = document.getElementById("reqMessage");
    var logoutBtn = document.getElementById("logoutBtn");

    var currentAdmin = null;
    var requests = [];
    var courseMap = {};


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

    function say(text) {
        banner.style.display = "block";
        banner.textContent = text;
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

            currentAdmin = user;

            await loadRequests();

        } catch (error) {
            console.error(error);
            alert("Unable to verify admin account.");
        }
    });


    async function loadRequests() {

        try {

            var results = await Promise.all([
                db.collection("enrollmentRequests").get(),
                db.collection("courses").get()
            ]);

            courseMap = {};

            results[1].forEach(function (doc) {
                courseMap[doc.id] = doc.data();
            });

            requests = [];

            results[0].forEach(function (doc) {
                requests.push(Object.assign({ id: doc.id }, doc.data()));
            });

            requests.sort(function (a, b) {
                var at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                var bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                return bt - at;
            });

            render();

        } catch (error) {

            console.error(error);

            statusBox.style.display = "block";
            statusBox.innerHTML =
                '<div class="alert alert-error">Unable to load requests. ' + esc(error.message) + "</div>";
        }
    }

    function render() {

        list.innerHTML = "";

        if (!requests.length) {
            statusBox.style.display = "block";
            statusBox.innerHTML = "<h3>No pending requests</h3><p>New requests will appear here.</p>";
            return;
        }

        statusBox.style.display = "none";

        requests.forEach(function (req) {

            var course = courseMap[req.courseId] || {};

            var price = Number(course.price) || 0;

            var card = document.createElement("div");

            card.className = "card";

            card.innerHTML =
                '<div class="card-body">' +
                    "<h3>" + esc(req.courseTitle || req.courseId) + "</h3>" +
                    "<p><strong>Student:</strong> " + esc(req.studentName || "-") + " &lt;" + esc(req.studentEmail) + "&gt;</p>" +
                    "<p><strong>Course ID:</strong> " + esc(req.courseId) + "</p>" +
                    "<p><strong>Fee:</strong> " + (course.accessType === "free" ? "Free" : (price ? "₹" + price : "Paid")) + "</p>" +
                    '<p style="color:#6b7280;font-size:13px;">Requested: ' + esc(formatDate(req.createdAt)) + "</p>" +
                    '<div class="button-group" style="margin-top:14px;">' +
                        '<button class="btn btn-primary approve-req" data-id="' + esc(req.id) + '" type="button">Approve &amp; Enroll</button>' +
                        '<button class="btn btn-danger reject-req" data-id="' + esc(req.id) + '" type="button">Reject</button>' +
                    "</div>" +
                "</div>";

            list.appendChild(card);
        });
    }


    list.addEventListener("click", async function (event) {

        var approve = event.target.closest(".approve-req");
        var reject = event.target.closest(".reject-req");

        var button = approve || reject;

        if (!button) return;

        var req = requests.filter(function (r) { return r.id === button.dataset.id; })[0];

        if (!req) return;

        if (reject) {

            if (!confirm("Reject this request?")) return;

            button.disabled = true;

            try {

                await db.collection("enrollmentRequests").doc(req.id).delete();

                say("Request rejected.");

                await loadRequests();

            } catch (error) {

                console.error(error);

                button.disabled = false;

                say("Failed: " + error.message);
            }

            return;
        }

        if (!confirm("Have you received the payment? Enroll " + (req.studentName || req.studentEmail) + " in " + (req.courseTitle || req.courseId) + "?")) {
            return;
        }

        button.disabled = true;

        try {

            var existing = await db
                .collection("enrollments")
                .where("studentId", "==", req.studentId)
                .where("courseId", "==", req.courseId)
                .get();

            if (existing.empty) {

                await db.collection("enrollments").add({
                    studentId: req.studentId,
                    studentName: req.studentName || "",
                    studentEmail: req.studentEmail || "",
                    courseId: req.courseId,
                    courseTitle: req.courseTitle || req.courseId,
                    enrolledAt: firebase.firestore.FieldValue.serverTimestamp(),
                    enrolledBy: currentAdmin.uid
                });
            }

            await db.collection("students").doc(req.studentId).update({
                enrolledCourses: firebase.firestore.FieldValue.arrayUnion(req.courseId)
            });

            await db.collection("enrollmentRequests").doc(req.id).delete();

            say((req.studentName || req.studentEmail) + " is now enrolled in " + (req.courseTitle || req.courseId) + ".");

            await loadRequests();

        } catch (error) {

            console.error(error);

            button.disabled = false;

            say("Failed to enroll: " + error.message);
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
