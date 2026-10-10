/* =========================================================
   DRx LEARNING HUB - STUDENT PROFILE EXTRAS
   1) Optional profile photo (saved small inside the student
      document, no paid storage needed)
   2) My courses + enroll in more courses later
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var photoCard = document.getElementById("photoCard");
    var enrollCard = document.getElementById("enrollCard");

    if (!photoCard || !enrollCard || typeof auth === "undefined") return;

    var avatar = document.querySelector(".profile-avatar");
    var initialEl = document.getElementById("profileInitial");

    var currentUser = null;
    var student = {};
    var courses = [];
    var requests = {};


    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function flash(box, text, ok) {

        var el = box.querySelector(".extras-message");

        if (!el) return;

        el.style.display = "block";
        el.className = "extras-message " + (ok ? "ok" : "bad");
        el.textContent = text;
    }


    /* ================= START ================= */

    auth.onAuthStateChanged(async function (user) {

        if (!user) return;

        currentUser = user;

        try {

            var snap = await db.collection("students").doc(user.uid).get();

            student = snap.exists ? snap.data() : {};

            await loadCourses();

            await loadRequests();

            renderPhoto();

            renderEnroll();

            // opened from signup / a link: scroll to the enroll box
            if (new URLSearchParams(window.location.search).get("enroll")) {
                enrollCard.scrollIntoView({ behavior: "smooth" });
            }

        } catch (error) {

            console.error("Profile extras error:", error);

            photoCard.innerHTML = "";
            enrollCard.innerHTML =
                '<div class="alert alert-error">Unable to load your courses. ' + esc(error.message) + "</div>";
        }
    });

    async function loadCourses() {

        var snapshot = await db.collection("courses").where("status", "==", "active").get();

        courses = [];

        snapshot.forEach(function (doc) {
            courses.push(Object.assign({ id: doc.id }, doc.data()));
        });

        courses.sort(function (a, b) {
            return String(a.title || a.id).localeCompare(String(b.title || b.id));
        });
    }

    async function loadRequests() {

        var snapshot = await db
            .collection("enrollmentRequests")
            .where("studentId", "==", currentUser.uid)
            .get();

        requests = {};

        snapshot.forEach(function (doc) {
            requests[doc.data().courseId] = true;
        });
    }


    /* ================= PROFILE PHOTO ================= */

    function showPhotoInAvatar() {

        if (!avatar) return;

        if (student.photo) {

            avatar.style.backgroundImage = "url('" + student.photo + "')";
            avatar.style.backgroundSize = "cover";
            avatar.style.backgroundPosition = "center";

            if (initialEl) initialEl.style.display = "none";

        } else {

            avatar.style.backgroundImage = "";

            if (initialEl) initialEl.style.display = "";
        }
    }

    function renderPhoto() {

        showPhotoInAvatar();

        photoCard.innerHTML =
            "<h2>Profile Photo</h2>" +
            '<p class="extras-help">Adding a photo is optional. It is shown only on your profile.</p>' +
            '<div class="photo-row">' +
                '<div class="photo-preview" id="photoPreview"></div>' +
                '<div class="photo-actions">' +
                    '<input type="file" id="photoInput" accept="image/*" style="display:none;">' +
                    '<button type="button" class="btn btn-primary" id="photoChoose">' +
                        (student.photo ? "Change Photo" : "Add Photo") + "</button>" +
                    (student.photo
                        ? '<button type="button" class="btn btn-danger" id="photoRemove">Remove Photo</button>'
                        : "") +
                "</div>" +
            "</div>" +
            '<div class="extras-message" style="display:none;"></div>';

        var preview = document.getElementById("photoPreview");

        if (student.photo) {
            preview.style.backgroundImage = "url('" + student.photo + "')";
        } else {
            preview.textContent = ((student.name || currentUser.displayName || "S").trim().charAt(0) || "S").toUpperCase();
        }

        var input = document.getElementById("photoInput");

        document.getElementById("photoChoose").addEventListener("click", function () {
            input.click();
        });

        input.addEventListener("change", function () {

            var file = input.files && input.files[0];

            if (file) handlePhoto(file);
        });

        var removeBtn = document.getElementById("photoRemove");

        if (removeBtn) {
            removeBtn.addEventListener("click", removePhoto);
        }
    }

    function handlePhoto(file) {

        if (!/^image\//.test(file.type)) {
            flash(photoCard, "Please choose an image file.", false);
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            flash(photoCard, "Image is too big. Please choose a photo under 8 MB.", false);
            return;
        }

        var reader = new FileReader();

        reader.onload = function () {

            var img = new Image();

            img.onload = async function () {

                // crop the middle square and shrink to 240 x 240
                var size = Math.min(img.width, img.height);
                var sx = (img.width - size) / 2;
                var sy = (img.height - size) / 2;

                var canvas = document.createElement("canvas");

                canvas.width = 240;
                canvas.height = 240;

                canvas.getContext("2d").drawImage(img, sx, sy, size, size, 0, 0, 240, 240);

                var dataUrl = canvas.toDataURL("image/jpeg", 0.82);

                try {

                    await db.collection("students").doc(currentUser.uid).update({ photo: dataUrl });

                    student.photo = dataUrl;

                    renderPhoto();

                    flash(photoCard, "Profile photo saved.", true);

                } catch (error) {

                    console.error(error);

                    flash(photoCard, "Could not save the photo: " + error.message, false);
                }
            };

            img.onerror = function () {
                flash(photoCard, "This image could not be read. Try another one.", false);
            };

            img.src = reader.result;
        };

        reader.readAsDataURL(file);
    }

    async function removePhoto() {

        if (!confirm("Remove your profile photo?")) return;

        try {

            await db.collection("students").doc(currentUser.uid).update({
                photo: firebase.firestore.FieldValue.delete()
            });

            delete student.photo;

            renderPhoto();

            flash(photoCard, "Profile photo removed.", true);

        } catch (error) {

            console.error(error);

            flash(photoCard, "Could not remove the photo: " + error.message, false);
        }
    }


    /* ================= COURSES ================= */

    function renderEnroll() {

        var enrolledIds = student.enrolledCourses || [];

        var mine = courses.filter(function (c) { return enrolledIds.indexOf(c.id) !== -1; });

        var others = courses.filter(function (c) { return enrolledIds.indexOf(c.id) === -1; });

        var html = "<h2>My Courses</h2>";

        if (!mine.length) {

            html += '<p class="extras-help">You have not enrolled in any course yet. Choose a course below.</p>';

        } else {

            html += '<div class="enroll-list">';

            mine.forEach(function (c) {
                html +=
                    '<div class="enroll-row">' +
                        '<div><strong>' + esc(c.title || c.id) + "</strong>" +
                            '<span class="enroll-meta">' + esc(c.id) + "</span></div>" +
                        '<a class="btn btn-primary btn-small" href="learn.html?course=' + encodeURIComponent(c.id) + '">Open</a>' +
                    "</div>";
            });

            html += "</div>";
        }

        html += '<h2 style="margin-top:28px;">Enroll in Another Course</h2>';

        if (!others.length) {

            html += '<p class="extras-help">You are enrolled in every available course.</p>';

        } else {

            html += '<div class="enroll-list">';

            others.forEach(function (c) {

                var action;

                if (c.accessType === "free") {

                    action = '<button class="btn btn-primary btn-small enroll-free" data-id="' + esc(c.id) + '" type="button">Enroll Free</button>';

                } else {

                    action = '<a class="btn btn-primary btn-small" href="learn.html?course=' + encodeURIComponent(c.id) + '">Pay &amp; Enroll</a>';
                }

                html +=
                    '<div class="enroll-row">' +
                        '<div><strong>' + esc(c.title || c.id) + "</strong>" +
                            '<span class="enroll-meta">' + esc(c.id) + " • " + esc(DRX_ENROLL.priceLabel(c)) + "</span></div>" +
                        "<div>" + action + "</div>" +
                    "</div>";
            });

            html += "</div>";
        }

        html += '<div class="extras-message" style="display:none;"></div>';

        enrollCard.innerHTML = html;

        enrollCard.querySelectorAll(".enroll-free").forEach(function (btn) {
            btn.addEventListener("click", function () { enrollFreeCourse(btn); });
        });

        enrollCard.querySelectorAll(".enroll-paid").forEach(function (btn) {
            btn.addEventListener("click", function () { requestPaidCourse(btn); });
        });
    }

    function courseOf(id) {
        return courses.filter(function (c) { return c.id === id; })[0];
    }

    async function enrollFreeCourse(btn) {

        var course = courseOf(btn.dataset.id);

        btn.disabled = true;

        try {

            await DRX_ENROLL.enrollFree(currentUser, student.name, course, student.enrolledCourses || []);

            student.enrolledCourses = (student.enrolledCourses || []).concat([course.id]);

            renderEnroll();

            flash(enrollCard, "You are enrolled in " + (course.title || course.id) + ".", true);

        } catch (error) {

            console.error(error);

            btn.disabled = false;

            flash(enrollCard, "Could not enroll: " + error.message, false);
        }
    }

    async function requestPaidCourse(btn) {

        var course = courseOf(btn.dataset.id);

        btn.disabled = true;

        try {

            await DRX_ENROLL.requestPaid(currentUser, student.name, course);

            requests[course.id] = true;

            renderEnroll();

            flash(
                enrollCard,
                "Request sent for " + (course.title || course.id) +
                ". Complete the payment (see Payment steps), then we will enroll you.",
                true
            );

        } catch (error) {

            console.error(error);

            btn.disabled = false;

            flash(enrollCard, "Could not send the request: " + error.message, false);
        }
    }

});
