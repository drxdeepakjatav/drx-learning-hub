document.addEventListener("DOMContentLoaded", function () {


    // ==========================================
    // GET ELEMENTS
    // ==========================================

    const courseForm =
        document.getElementById("courseForm");

    const editingCourseId =
        document.getElementById("editingCourseId");

    const courseId =
        document.getElementById("courseId");

    const courseTitle =
        document.getElementById("courseTitle");

    const courseCategory =
        document.getElementById("courseCategory");

    const courseTermType =
        document.getElementById("courseTermType");

    const courseTerm =
        document.getElementById("courseTerm");

    const courseTermGroup =
        document.getElementById("courseTermGroup");

    const courseTermLabel =
        document.getElementById("courseTermLabel");


    // Year wise = 1-5, Semester wise = 1-8

    function updateTermUI(selectedValue) {

        const type = courseTermType.value;

        if (!type) {

            courseTermGroup.style.display = "none";

            courseTerm.innerHTML = "";

            return;

        }

        const isYear = type === "year";

        const label = isYear ? "Year" : "Semester";

        const total = isYear ? 5 : 8;

        courseTermLabel.textContent = label;

        let html = '<option value="">Select ' + label + '</option>';

        for (let i = 1; i <= total; i++) {

            html += '<option value="' + i + '">' + label + ' ' + i + '</option>';

        }

        courseTerm.innerHTML = html;

        courseTerm.value = selectedValue ? String(selectedValue) : "";

        courseTermGroup.style.display = "block";

    }

    courseTermType.addEventListener("change", function () {

        updateTermUI("");

    });

    const courseDescription =
        document.getElementById("courseDescription");

    const courseImage =
        document.getElementById("courseImage");

    const coursePlaylist =
        document.getElementById("coursePlaylist");

    const courseLessons =
        document.getElementById("courseLessons");

    const courseStatus =
        document.getElementById("courseStatus");

    const saveCourseBtn =
        document.getElementById("saveCourseBtn");

    const cancelEditBtn =
        document.getElementById("cancelEditBtn");

    const formTitle =
        document.getElementById("formTitle");

    const courseList =
        document.getElementById("courseList");

    const loadingCourses =
        document.getElementById("loadingCourses");

    const noCourses =
        document.getElementById("noCourses");

    const courseMessage =
        document.getElementById("courseMessage");

    const logoutBtn =
        document.getElementById("logoutBtn");


    let currentAdmin = null;



    // ==========================================
    // ADMIN AUTH CHECK
    // ==========================================

    auth.onAuthStateChanged(async function (user) {

        if (!user) {

            window.location.href =
                "admin-login.html";

            return;

        }


        try {

            const adminDoc = await db
                .collection("admins")
                .doc(user.uid)
                .get();


            if (
                !adminDoc.exists ||
                adminDoc.data().role !== "admin"
            ) {

                await auth.signOut();

                alert(
                    "Access denied. Admin account required."
                );

                window.location.href =
                    "admin-login.html";

                return;

            }


            currentAdmin = user;

            loadCourses();

        }

        catch (error) {

            console.error(
                "Admin verification error:",
                error
            );

            showMessage(
                "Unable to verify admin account.",
                "error"
            );

        }

    });



    // ==========================================
    // ADD / UPDATE COURSE
    // ==========================================

    courseForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (!currentAdmin) {

                showMessage(
                    "Admin login required.",
                    "error"
                );

                return;

            }


            const id =
                courseId.value
                    .trim()
                    .toUpperCase();

            const title =
                courseTitle.value.trim();

            const category =
                courseCategory.value;

            const termType =
                courseTermType.value || null;

            const term =
                termType && courseTerm.value
                    ? Number(courseTerm.value)
                    : null;

            const description =
                courseDescription.value.trim();

            const image =
                courseImage.value.trim();

            const playlistUrl =
                coursePlaylist.value.trim();

            const lessons =
                Number(courseLessons.value) || 0;

            const status =
                courseStatus.value;

            const editingId =
                editingCourseId.value.trim();


            if (!id || !title || !category || !description) {

                showMessage(
                    "Please fill all required fields.",
                    "error"
                );

                return;

            }


            if (termType && !term) {

                showMessage(
                    "Please select the " + termType + " number.",
                    "error"
                );

                return;

            }


            saveCourseBtn.disabled = true;

            saveCourseBtn.textContent =
                editingId
                    ? "Updating..."
                    : "Adding...";


            try {


                // ==================================
                // UPDATE COURSE
                // ==================================

                if (editingId) {

                    await db
                        .collection("courses")
                        .doc(editingId)
                        .update({

                            title: title,

                            category: category,

                            termType: termType,

                            term: term,

                            semester: termType === "semester" ? term : null,

                            description: description,

                            image: image,

                            playlistUrl: playlistUrl,

                            lessons: lessons,

                            status: status,

                            updatedAt:
                                firebase.firestore.FieldValue.serverTimestamp(),

                            updatedBy:
                                currentAdmin.uid

                        });


                    showMessage(
                        "Course updated successfully!",
                        "success"
                    );

                }


                // ==================================
                // ADD NEW COURSE
                // ==================================

                else {


                    const existingCourse =
                        await db
                            .collection("courses")
                            .doc(id)
                            .get();


                    if (existingCourse.exists) {

                        showMessage(
                            "Course ID already exists. Please use another ID.",
                            "error"
                        );

                        return;

                    }


                    await db
                        .collection("courses")
                        .doc(id)
                        .set({

                            title: title,

                            category: category,

                            termType: termType,

                            term: term,

                            semester: termType === "semester" ? term : null,

                            description: description,

                            image: image,

                            playlistUrl: playlistUrl,

                            lessons: lessons,

                            status: status,

                            createdAt:
                                firebase.firestore.FieldValue.serverTimestamp(),

                            createdBy:
                                currentAdmin.uid,

                            updatedAt:
                                firebase.firestore.FieldValue.serverTimestamp(),

                            updatedBy:
                                currentAdmin.uid

                        });


                    showMessage(
                        "Course added successfully!",
                        "success"
                    );

                }


                resetForm();

                loadCourses();

            }

            catch (error) {

                console.error(
                    "Course save error:",
                    error
                );

                showMessage(
                    "Error: " + error.message,
                    "error"
                );

            }

            finally {

                saveCourseBtn.disabled = false;

                saveCourseBtn.textContent =
                    editingCourseId.value
                        ? "Update Course"
                        : "Add Course";

            }

        }
    );



    // ==========================================
    // LOAD COURSES
    // ==========================================

    async function loadCourses() {

        loadingCourses.style.display =
            "block";

        courseList.innerHTML = "";

        noCourses.style.display =
            "none";


        try {

            const snapshot =
                await db
                    .collection("courses")
                    .get();


            loadingCourses.style.display =
                "none";


            if (snapshot.empty) {

                noCourses.style.display =
                    "block";

                return;

            }


            const courses = [];


            snapshot.forEach(function (doc) {

                courses.push({

                    id: doc.id,

                    ...doc.data()

                });

            });


            // Newest first
            courses.sort(function (a, b) {

                const aTime =
                    a.createdAt &&
                    a.createdAt.toMillis
                        ? a.createdAt.toMillis()
                        : 0;

                const bTime =
                    b.createdAt &&
                    b.createdAt.toMillis
                        ? b.createdAt.toMillis()
                        : 0;

                return bTime - aTime;

            });


            courses.forEach(function (course) {

                renderCourse(course);

            });

        }

        catch (error) {

            loadingCourses.style.display =
                "none";

            console.error(
                "Load courses error:",
                error
            );

            showMessage(
                "Unable to load courses: " +
                error.message,
                "error"
            );

        }

    }



    // ==========================================
    // RENDER COURSE
    // ==========================================

    function renderCourse(course) {


        const card =
            document.createElement("div");

        card.className =
            "course-card";


        const imageHTML =
            course.image
                ? `
                    <img
                        src="${escapeHTML(course.image)}"
                        alt="${escapeHTML(course.title || "Course")}"
                        style="width:100%; height:180px; object-fit:cover; border-radius:10px;"
                    >
                  `
                : `
                    <div
                        style="
                            height:180px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            background:#f1f1f1;
                            border-radius:10px;
                        "
                    >
                        <strong>
                            DRx Learning Hub
                        </strong>
                    </div>
                  `;


        const statusClass =
            course.status === "active"
                ? "alert-success"
                : "alert-error";


        card.innerHTML = `

            ${imageHTML}

            <div style="padding-top:15px;">

                <span class="${statusClass}">
                    ${escapeHTML(course.status || "inactive")}
                </span>

                <h3 style="margin-top:12px;">
                    ${escapeHTML(course.title || "Untitled Course")}
                </h3>

                <p>
                    <strong>Course ID:</strong>
                    ${escapeHTML(course.id)}
                </p>

                <p>
                    <strong>Category:</strong>
                    ${escapeHTML(course.category || "Other")}
                </p>

                <p>
                    <strong>${course.termType === "year" ? "Year" : "Semester"}:</strong>
                    ${
                        course.termType && course.term
                            ? (course.termType === "year" ? "Year " : "Semester ") + escapeHTML(course.term)
                            : (course.semester ? "Semester " + escapeHTML(course.semester) : "Not applicable")
                    }
                </p>

                <p>
                    <strong>Lessons:</strong>
                    ${Number(course.lessons) || 0}
                </p>

                <p>
                    ${escapeHTML(course.description || "")}
                </p>


                <div
                    class="button-group"
                    style="margin-top:15px;"
                >

                    <button
                        class="btn btn-primary edit-course-btn"
                        data-id="${escapeHTML(course.id)}"
                        type="button"
                    >
                        Edit
                    </button>

                    <button
                        class="btn btn-danger delete-course-btn"
                        data-id="${escapeHTML(course.id)}"
                        type="button"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `;


        courseList.appendChild(card);

    }



    // ==========================================
    // EDIT COURSE
    // ==========================================

    courseList.addEventListener(
        "click",
        async function (event) {


            const editButton =
                event.target.closest(
                    ".edit-course-btn"
                );


            const deleteButton =
                event.target.closest(
                    ".delete-course-btn"
                );


            // -------------------------------
            // EDIT
            // -------------------------------

            if (editButton) {

                const id =
                    editButton.dataset.id;

                await editCourse(id);

            }


            // -------------------------------
            // DELETE
            // -------------------------------

            if (deleteButton) {

                const id =
                    deleteButton.dataset.id;

                await deleteCourse(id);

            }

        }
    );



    // ==========================================
    // EDIT FUNCTION
    // ==========================================

    async function editCourse(id) {

        try {

            const doc =
                await db
                    .collection("courses")
                    .doc(id)
                    .get();


            if (!doc.exists) {

                showMessage(
                    "Course not found.",
                    "error"
                );

                return;

            }


            const course =
                doc.data();


            editingCourseId.value =
                id;

            courseId.value =
                id;

            courseId.disabled =
                true;

            courseTitle.value =
                course.title || "";

            courseCategory.value =
                course.category || "";

            if (course.termType && course.term) {

                courseTermType.value = course.termType;

                updateTermUI(course.term);

            } else if (course.semester) {

                courseTermType.value = "semester";

                updateTermUI(course.semester);

            } else {

                courseTermType.value = "";

                updateTermUI("");

            }

            courseDescription.value =
                course.description || "";

            coursePlaylist.value =
                course.playlistUrl || "";

            courseImage.value =
                course.image || "";

            courseLessons.value =
                course.lessons || 0;

            courseStatus.value =
                course.status || "active";


            formTitle.textContent =
                "Edit Course";

            saveCourseBtn.textContent =
                "Update Course";

            cancelEditBtn.style.display =
                "inline-block";


            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        }

        catch (error) {

            console.error(error);

            showMessage(
                "Unable to load course.",
                "error"
            );

        }

    }



    // ==========================================
    // DELETE COURSE
    // ==========================================

    async function deleteCourse(id) {


        const confirmDelete =
            confirm(
                "Are you sure you want to delete this course?\n\nCourse ID: " +
                id
            );


        if (!confirmDelete) {

            return;

        }


        try {

            await db
                .collection("courses")
                .doc(id)
                .delete();


            showMessage(
                "Course deleted successfully!",
                "success"
            );


            loadCourses();

        }

        catch (error) {

            console.error(
                "Delete error:",
                error
            );

            showMessage(
                "Unable to delete course: " +
                error.message,
                "error"
            );

        }

    }



    // ==========================================
    // CANCEL EDIT
    // ==========================================

    cancelEditBtn.addEventListener(
        "click",
        function () {

            resetForm();

        }
    );



    // ==========================================
    // RESET FORM
    // ==========================================

    function resetForm() {

        courseForm.reset();

        updateTermUI("");

        editingCourseId.value =
            "";

        courseId.disabled =
            false;

        courseLessons.value =
            0;

        courseStatus.value =
            "active";

        formTitle.textContent =
            "Add New Course";

        saveCourseBtn.textContent =
            "Add Course";

        cancelEditBtn.style.display =
            "none";

    }



    // ==========================================
    // LOGOUT
    // ==========================================

    logoutBtn.addEventListener(
        "click",
        async function () {

            try {

                await auth.signOut();

                window.location.href =
                    "admin-login.html";

            }

            catch (error) {

                console.error(error);

                alert(
                    "Logout failed."
                );

            }

        }
    );



    // ==========================================
    // ESCAPE HTML
    // ==========================================

    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }



    // ==========================================
    // MESSAGE
    // ==========================================

    function showMessage(message, type) {

        courseMessage.textContent =
            message;

        courseMessage.style.display =
            "block";


        if (type === "success") {

            courseMessage.className =
                "alert alert-success";

        }

        else {

            courseMessage.className =
                "alert alert-error";

        }


        setTimeout(function () {

            courseMessage.style.display =
                "none";

        }, 5000);

    }

});