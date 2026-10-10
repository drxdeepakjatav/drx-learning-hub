document.addEventListener("DOMContentLoaded", function () {

    const coursesContainer = document.getElementById("coursesContainer");
    const coursesLoading = document.getElementById("coursesLoading");
    const noCourses = document.getElementById("noCourses");
    const noSearchResults = document.getElementById("noSearchResults");
    const courseSearch = document.getElementById("courseSearch");

    const categoryButtons =
        document.querySelectorAll("#categoryFilter .filter-btn");

    const termFilter = document.getElementById("termFilter");


    let allCourses = [];

    let selectedCategory = "all";

    let selectedTerm = "all";


    /* Year wise / Semester wise helper
       (old courses with only "semester" still work) */

    function getTerm(course) {

        if (course.termType && course.term) {

            return { type: course.termType, num: Number(course.term) };

        }

        if (course.semester) {

            return { type: "semester", num: Number(course.semester) };

        }

        return null;

    }

    function termLabel(term) {

        if (!term) return "";

        return (term.type === "year" ? "Year " : "Semester ") + term.num;

    }

    function termKey(term) {

        return term ? term.type + "-" + term.num : "";

    }


    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* ================= LOAD COURSES ================= */

    async function loadCourses() {

        try {

            coursesLoading.style.display = "block";
            coursesContainer.style.display = "none";
            noCourses.style.display = "none";
            noSearchResults.style.display = "none";


            const snapshot = await db
                .collection("courses")
                .where("status", "==", "active")
                .get();


            allCourses = [];

            snapshot.forEach(function (doc) {

                allCourses.push({
                    id: doc.id,
                    ...doc.data()
                });

            });


            /* Year wise first, then semester wise, then newest */

            function order(course) {

                const t = getTerm(course);

                if (!t) return 9999;

                return (t.type === "year" ? 0 : 100) + t.num;

            }

            allCourses.sort(function (a, b) {

                if (order(a) !== order(b)) {
                    return order(a) - order(b);
                }

                const aTime =
                    a.createdAt && a.createdAt.toMillis
                        ? a.createdAt.toMillis()
                        : 0;

                const bTime =
                    b.createdAt && b.createdAt.toMillis
                        ? b.createdAt.toMillis()
                        : 0;

                return bTime - aTime;

            });


            buildTermFilter();


            coursesLoading.style.display = "none";


            if (allCourses.length === 0) {

                noCourses.style.display = "block";

                return;

            }


            renderCourses();

        }

        catch (error) {

            console.error("Error loading courses:", error);

            coursesLoading.style.display = "none";

            coursesContainer.style.display = "block";

            coursesContainer.innerHTML = `
                <div class="alert alert-error">
                    Unable to load courses.
                    <br>
                    Please try again later.
                </div>
            `;

        }

    }


    /* ================= RENDER COURSES ================= */

    function renderCourses() {

        const searchText =
            courseSearch.value.trim().toLowerCase();


        const filteredCourses =
            allCourses.filter(function (course) {

                const categoryMatch =
                    selectedCategory === "all" ||
                    String(course.category || "").toLowerCase()
                        === selectedCategory;


                const termMatch =
                    selectedTerm === "all" ||
                    termKey(getTerm(course)) === selectedTerm;


                const searchMatch =

                    !searchText ||

                    String(course.title || "")
                        .toLowerCase().includes(searchText) ||

                    String(course.courseId || course.id || "")
                        .toLowerCase().includes(searchText) ||

                    String(course.description || "")
                        .toLowerCase().includes(searchText);


                return categoryMatch && termMatch && searchMatch;

            });


        coursesContainer.innerHTML = "";


        if (filteredCourses.length === 0) {

            coursesContainer.style.display = "none";
            noCourses.style.display = "none";
            noSearchResults.style.display = "block";

            return;

        }


        noCourses.style.display = "none";
        noSearchResults.style.display = "none";
        coursesContainer.style.display = "grid";


        filteredCourses.forEach(function (course) {

            const title =
                escapeHTML(course.title || "Untitled Course");

            const description =
                escapeHTML(
                    course.description ||
                    "Start learning with DRx Learning Hub."
                );

            const courseId =
                escapeHTML(course.courseId || course.id);

            const category =
                escapeHTML(
                    String(course.category || "other").toUpperCase()
                );

            const semesterText =
                escapeHTML(termLabel(getTerm(course)));

            const lessons =
                escapeHTML(course.lessons || "0");

            const priceText =
                course.accessType === "free"
                    ? "FREE"
                    : (Number(course.price) ? "₹" + Number(course.price) : "Paid");

            const freeCount = Number(course.freeUnits) || 0;

            const priceNote =
                course.accessType !== "free" && freeCount > 0
                    ? " • first " + freeCount + " unit" + (freeCount > 1 ? "s" : "") + " free"
                    : "";

            const image =
                course.imageUrl || course.image || "";


            const imageHTML = image

                ? `<img
                        src="${escapeHTML(image)}"
                        alt="${title}"
                        loading="lazy"
                        onerror="this.style.display='none';"
                   >`

                : `<div class="course-image-placeholder">📚</div>`;


            const card = document.createElement("div");

            card.className = "course-card";


            card.innerHTML = `

                <div class="course-card-image">
                    ${imageHTML}
                </div>

                <div class="course-card-content">

                    <span class="course-category">
                        ${category}${semesterText ? " • " + semesterText : ""}
                    </span>

                    <h3>${title}</h3>

                    <p>${description}</p>

                    <div class="course-meta">
                        <span>📘 ${courseId}</span>
                        <span>📚 ${lessons} Lessons</span>
                        <span class="price-tag ${course.accessType === "free" ? "free" : "paid"}">
                            ${escapeHTML(priceText)}${escapeHTML(priceNote)}
                        </span>
                    </div>

                    <a href="learn.html?course=${encodeURIComponent(course.id)}" class="btn btn-primary">
                        Start Learning
                    </a>

                </div>

            `;


            coursesContainer.appendChild(card);

        });

    }


    /* ================= SEARCH ================= */

    courseSearch.addEventListener("input", renderCourses);


    /* ================= CATEGORY FILTER ================= */

    categoryButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            categoryButtons.forEach(function (btn) {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            selectedCategory = button.dataset.category;

            renderCourses();

        });

    });


    /* ================= YEAR / SEMESTER FILTER ================= */

    function buildTermFilter() {

        const terms = {};

        allCourses.forEach(function (course) {

            const t = getTerm(course);

            if (t) {
                terms[termKey(t)] = t;
            }

        });

        const list = Object.keys(terms)
            .map(function (key) { return terms[key]; })
            .sort(function (a, b) {

                if (a.type !== b.type) {
                    return a.type === "year" ? -1 : 1;
                }

                return a.num - b.num;

            });

        if (list.length === 0) {

            termFilter.style.display = "none";

            return;

        }

        let html =
            '<button class="filter-btn active" data-term="all">All Years / Semesters</button>';

        list.forEach(function (t) {

            html +=
                '<button class="filter-btn" data-term="' + termKey(t) + '">' +
                termLabel(t) +
                '</button>';

        });

        termFilter.innerHTML = html;

        termFilter.style.display = "flex";

        termFilter.querySelectorAll(".filter-btn").forEach(function (button) {

            button.addEventListener("click", function () {

                termFilter.querySelectorAll(".filter-btn").forEach(function (btn) {
                    btn.classList.remove("active");
                });

                button.classList.add("active");

                selectedTerm = button.dataset.term;

                renderCourses();

            });

        });

    }


    /* ================= START ================= */

    if (typeof db !== "undefined") {

        loadCourses();

    } else {

        coursesLoading.style.display = "none";

        coursesContainer.style.display = "block";

        coursesContainer.innerHTML = `
            <div class="alert alert-error">
                Firebase connection error.
                <br>
                Please check firebase-config.js.
            </div>
        `;

    }

});
