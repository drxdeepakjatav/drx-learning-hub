/* =========================================================
   DRx LEARNING HUB - ADMIN: UNITS & PDF LINKS
   Collection: units
   Fields: courseId, unitNumber, title, pdfUrl, status
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var form = document.getElementById("unitForm");
    var editingUnitId = document.getElementById("editingUnitId");
    var unitCourse = document.getElementById("unitCourse");
    var unitNumber = document.getElementById("unitNumber");
    var unitTitle = document.getElementById("unitTitle");
    var unitPdf = document.getElementById("unitPdf");
    var unitStatus = document.getElementById("unitStatus");
    var saveBtn = document.getElementById("saveUnitBtn");
    var cancelBtn = document.getElementById("cancelEditBtn");
    var formTitle = document.getElementById("formTitle");
    var message = document.getElementById("unitMessage");
    var unitList = document.getElementById("unitList");
    var noUnits = document.getElementById("noUnits");
    var listTitle = document.getElementById("listTitle");
    var logoutBtn = document.getElementById("logoutBtn");

    var currentAdmin = null;
    var units = [];


    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showMessage(text, type) {
        message.style.display = "block";
        message.className = "alert " + (type === "success" ? "success" : "alert-error");
        message.textContent = text;
        message.style.opacity = "1";
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

            await loadCourses();

            var preset = new URLSearchParams(window.location.search).get("course");

            if (preset) {
                unitCourse.value = preset;
                loadUnits();
            }

        } catch (error) {
            console.error(error);
            alert("Unable to verify admin account.");
        }
    });


    /* ================= COURSES DROPDOWN ================= */

    async function loadCourses() {

        var snapshot = await db.collection("courses").get();

        var list = [];

        snapshot.forEach(function (doc) {
            list.push({ id: doc.id, title: doc.data().title || doc.id });
        });

        list.sort(function (a, b) {
            return a.id.localeCompare(b.id);
        });

        unitCourse.innerHTML =
            '<option value="">Select Course</option>' +
            list.map(function (c) {
                return '<option value="' + esc(c.id) + '">' + esc(c.id) + " - " + esc(c.title) + "</option>";
            }).join("");
    }

    unitCourse.addEventListener("change", loadUnits);


    /* ================= LOAD UNITS ================= */

    async function loadUnits() {

        var courseId = unitCourse.value;

        unitList.innerHTML = "";
        noUnits.style.display = "none";

        if (!courseId) {
            listTitle.textContent = "Units";
            return;
        }

        listTitle.textContent = "Units of " + courseId;

        try {

            var snapshot = await db
                .collection("units")
                .where("courseId", "==", courseId)
                .get();

            units = [];

            snapshot.forEach(function (doc) {
                units.push(Object.assign({ id: doc.id }, doc.data()));
            });

            units.sort(function (a, b) {
                return (Number(a.unitNumber) || 0) - (Number(b.unitNumber) || 0);
            });

            renderUnits();

        } catch (error) {
            console.error(error);
            unitList.innerHTML =
                '<div class="alert alert-error">Unable to load units. ' + esc(error.message) + "</div>";
        }
    }

    function renderUnits() {

        unitList.innerHTML = "";

        if (!units.length) {
            noUnits.style.display = "block";
            return;
        }

        noUnits.style.display = "none";

        units.forEach(function (unit) {

            var card = document.createElement("div");

            card.className = "card";

            card.innerHTML =
                '<div class="card-body">' +
                    "<h3>Unit " + esc(unit.unitNumber) + "</h3>" +
                    "<p>" + esc(unit.title || "") + "</p>" +
                    "<p><strong>Status:</strong> " + esc(unit.status || "active") + "</p>" +
                    '<p><a href="' + esc(unit.pdfUrl) + '" target="_blank" rel="noopener">Open PDF link</a></p>' +
                    '<div class="button-group" style="margin-top:12px;">' +
                        '<button class="btn btn-primary edit-unit" data-id="' + esc(unit.id) + '" type="button">Edit</button>' +
                        '<button class="btn btn-danger delete-unit" data-id="' + esc(unit.id) + '" type="button">Delete</button>' +
                    "</div>" +
                "</div>";

            unitList.appendChild(card);
        });
    }


    /* ================= SAVE ================= */

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        if (!currentAdmin) return;

        var courseId = unitCourse.value;
        var number = Number(unitNumber.value);
        var title = unitTitle.value.trim();
        var pdfUrl = unitPdf.value.trim();
        var status = unitStatus.value;
        var editingId = editingUnitId.value;

        if (!courseId || !number || !title || !pdfUrl) {
            showMessage("Please fill all required fields.", "error");
            return;
        }

        // same unit number should not repeat in one course
        var duplicate = units.some(function (u) {
            return Number(u.unitNumber) === number && u.id !== editingId;
        });

        if (duplicate) {
            showMessage("Unit " + number + " already exists for this course.", "error");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = editingId ? "Updating..." : "Adding...";

        try {

            var data = {
                courseId: courseId,
                unitNumber: number,
                title: title,
                pdfUrl: pdfUrl,
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentAdmin.uid
            };

            if (editingId) {

                await db.collection("units").doc(editingId).update(data);

                showMessage("Unit updated successfully!", "success");

            } else {

                data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                data.createdBy = currentAdmin.uid;

                await db.collection("units").add(data);

                showMessage("Unit added successfully!", "success");
            }

            var keepCourse = courseId;

            resetForm();

            unitCourse.value = keepCourse;

            await loadUnits();

            // suggest next unit number
            var maxNumber = units.reduce(function (m, u) {
                return Math.max(m, Number(u.unitNumber) || 0);
            }, 0);

            unitNumber.value = maxNumber + 1;

        } catch (error) {

            console.error(error);

            showMessage("Failed to save unit: " + error.message, "error");

        } finally {

            saveBtn.disabled = false;
            saveBtn.textContent = editingUnitId.value ? "Update Unit" : "Add Unit";
        }
    });


    /* ================= EDIT / DELETE ================= */

    unitList.addEventListener("click", async function (event) {

        var editBtn = event.target.closest(".edit-unit");
        var deleteBtn = event.target.closest(".delete-unit");

        if (editBtn) {

            var unit = units.find(function (u) { return u.id === editBtn.dataset.id; });

            if (!unit) return;

            editingUnitId.value = unit.id;
            unitCourse.value = unit.courseId;
            unitNumber.value = unit.unitNumber;
            unitTitle.value = unit.title || "";
            unitPdf.value = unit.pdfUrl || "";
            unitStatus.value = unit.status || "active";

            formTitle.textContent = "Edit Unit";
            saveBtn.textContent = "Update Unit";
            cancelBtn.style.display = "inline-block";

            window.scrollTo({ top: 0, behavior: "smooth" });

            return;
        }

        if (deleteBtn) {

            if (!confirm("Delete this unit? This cannot be undone.")) return;

            try {

                await db.collection("units").doc(deleteBtn.dataset.id).delete();

                showMessage("Unit deleted.", "success");

                await loadUnits();

            } catch (error) {

                console.error(error);

                showMessage("Failed to delete unit: " + error.message, "error");
            }
        }
    });

    cancelBtn.addEventListener("click", function () {

        var keepCourse = unitCourse.value;

        resetForm();

        unitCourse.value = keepCourse;
    });

    function resetForm() {

        form.reset();

        editingUnitId.value = "";

        formTitle.textContent = "Add New Unit";
        saveBtn.textContent = "Add Unit";
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