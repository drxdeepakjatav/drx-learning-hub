/* =========================================================
   DRx LEARNING HUB - ADMIN: PAYMENTS
   Collection: payments  (written only by the server after a
   verified payment)
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var statusBox = document.getElementById("payStatus");
    var list = document.getElementById("payList");
    var search = document.getElementById("paySearch");
    var revenueEl = document.getElementById("totalRevenue");
    var countEl = document.getElementById("totalCount");
    var logoutBtn = document.getElementById("logoutBtn");

    var payments = [];


    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function rupees(paise) {
        return "₹" + (Number(paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
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

            await loadPayments();

        } catch (error) {
            console.error(error);
            alert("Unable to verify admin account.");
        }
    });


    async function loadPayments() {

        try {

            var snapshot = await db.collection("payments").get();

            payments = [];

            snapshot.forEach(function (doc) {
                payments.push(Object.assign({ id: doc.id }, doc.data()));
            });

            payments.sort(function (a, b) {
                var at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
                var bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
                return bt - at;
            });

            var total = payments.reduce(function (sum, p) { return sum + (Number(p.amount) || 0); }, 0);

            revenueEl.textContent = rupees(total);
            countEl.textContent = payments.length;

            render();

        } catch (error) {

            console.error(error);

            statusBox.style.display = "block";
            statusBox.innerHTML =
                '<div class="alert alert-error">Unable to load payments. ' + esc(error.message) + "</div>";
        }
    }

    function render() {

        var keyword = search.value.trim().toLowerCase();

        var shown = payments.filter(function (p) {

            if (!keyword) return true;

            return [p.studentName, p.studentEmail, p.courseTitle, p.courseId, p.orderId, p.id]
                .join(" ").toLowerCase().indexOf(keyword) !== -1;
        });

        list.innerHTML = "";

        if (!shown.length) {

            statusBox.style.display = "block";
            statusBox.innerHTML = "<h3>No payments found</h3><p>Payments will appear here after students pay.</p>";

            return;
        }

        statusBox.style.display = "none";

        shown.forEach(function (p) {

            var card = document.createElement("div");

            card.className = "card";

            card.innerHTML =
                '<div class="card-body">' +
                    "<h3>" + esc(rupees(p.amount)) + " — " + esc(p.courseTitle || p.courseId) + "</h3>" +
                    "<p><strong>Student:</strong> " + esc(p.studentName || "-") + " &lt;" + esc(p.studentEmail) + "&gt;</p>" +
                    "<p><strong>Course ID:</strong> " + esc(p.courseId) + "</p>" +
                    "<p><strong>Payment ID:</strong> <small>" + esc(p.id) + "</small></p>" +
                    "<p><strong>Order ID:</strong> <small>" + esc(p.orderId) + "</small></p>" +
                    "<p><strong>Status:</strong> " + esc(p.status || "paid") + "</p>" +
                    '<p style="color:#6b7280;font-size:13px;">' + esc(formatDate(p.createdAt)) + "</p>" +
                "</div>";

            list.appendChild(card);
        });
    }

    search.addEventListener("input", render);


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
