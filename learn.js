/* =========================================================
   DRx LEARNING HUB - LEARN PAGE
   Category > Semester/Year > Course > Unit > PDF
   Online Test button, Course Video Playlist, Notes button
   ========================================================= */

(function () {

    var CATEGORY_NAMES = {
        bpharm: "B.Pharm",
        mpharm: "M.Pharm",
        mmlt: "MMLT",
        other: "Other"
    };

    var CATEGORY_ORDER = ["bpharm", "mpharm", "mmlt", "other"];

    var content = document.getElementById("learnContent");
    var breadcrumb = document.getElementById("breadcrumb");

    var courses = [];
    var unitsCache = {};

    var state = { category: "", term: "", course: "", unit: "" };


    /* ================= HELPERS ================= */

    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function categoryName(key) {
        return CATEGORY_NAMES[key] || (key ? key.toUpperCase() : "Other");
    }

    function getTerm(course) {
        if (course.termType && course.term) {
            return { type: course.termType, num: Number(course.term) };
        }
        if (course.semester) {
            return { type: "semester", num: Number(course.semester) };
        }
        return null;
    }

    function termKey(course) {
        var t = getTerm(course);
        return t ? t.type + "-" + t.num : "none";
    }

    function termLabel(key) {
        if (key === "none") return "All Courses";
        var parts = key.split("-");
        return (parts[0] === "year" ? "Year " : "Semester ") + parts[1];
    }

    function termOrder(key) {
        if (key === "none") return 9999;
        var parts = key.split("-");
        return (parts[0] === "year" ? 0 : 100) + Number(parts[1]);
    }

    function courseById(id) {
        for (var i = 0; i < courses.length; i++) {
            if (courses[i].id === id) return courses[i];
        }
        return null;
    }

    function pdfEmbedUrl(url) {

        url = String(url || "").trim();

        var m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);

        if (!m && /drive\.google\.com/.test(url)) {
            m = url.match(/[?&]id=([\w-]+)/);
        }

        if (m) {
            return "https://drive.google.com/file/d/" + m[1] + "/preview";
        }

        return url;
    }

    function playlistEmbedUrl(url) {

        var m = String(url || "").match(/[?&]list=([\w-]+)/);

        return m
            ? "https://www.youtube-nocookie.com/embed/videoseries?list=" + m[1]
            : "";
    }


    /* ================= URL STATE ================= */

    function readState() {

        var p = new URLSearchParams(window.location.search);

        state = {
            category: p.get("category") || "",
            term: p.get("term") || "",
            course: p.get("course") || "",
            unit: p.get("unit") || ""
        };

        // Direct link: learn.html?course=BP102T
        if (state.course) {

            var c = courseById(state.course);

            if (c) {
                state.category = String(c.category || "other").toLowerCase();
                state.term = termKey(c);
            }
        }
    }

    function buildQuery(s) {

        var p = new URLSearchParams();

        if (s.category) p.set("category", s.category);
        if (s.term) p.set("term", s.term);
        if (s.course) p.set("course", s.course);
        if (s.unit) p.set("unit", s.unit);

        var q = p.toString();

        return "learn.html" + (q ? "?" + q : "");
    }

    function go(next, replace) {

        state = next;

        var url = buildQuery(state);

        if (replace) {
            history.replaceState({}, "", url);
        } else {
            history.pushState({}, "", url);
        }

        render();

        window.scrollTo({ top: 0, behavior: "smooth" });
    }


    /* ================= BREADCRUMB ================= */

    function renderBreadcrumb() {

        var items = [{ label: "Learn", next: { category: "", term: "", course: "", unit: "" } }];

        if (state.category) {
            items.push({
                label: categoryName(state.category),
                next: { category: state.category, term: "", course: "", unit: "" }
            });
        }

        if (state.term) {
            items.push({
                label: termLabel(state.term),
                next: { category: state.category, term: state.term, course: "", unit: "" }
            });
        }

        if (state.course) {
            var c = courseById(state.course);
            items.push({
                label: c ? c.title || c.id : state.course,
                next: { category: state.category, term: state.term, course: state.course, unit: "" }
            });
        }

        var html = "";

        items.forEach(function (item, index) {

            var last = index === items.length - 1 && !state.unit;

            if (index > 0) html += '<span class="sep">›</span>';

            if (last) {
                html += '<span class="current">' + esc(item.label) + "</span>";
            } else {
                html += '<a data-index="' + index + '">' + esc(item.label) + "</a>";
            }
        });

        if (state.unit) {
            html += '<span class="sep">›</span><span class="current">Unit</span>';
        }

        breadcrumb.innerHTML = html;

        breadcrumb.querySelectorAll("a").forEach(function (a) {
            a.addEventListener("click", function () {
                go(items[Number(a.getAttribute("data-index"))].next);
            });
        });
    }


    /* ================= SCREENS ================= */

    function setCards(title, subtitle, cards, onClick) {

        var html =
            '<div class="learn-title"><h2>' + esc(title) + "</h2><p>" + esc(subtitle) + "</p></div>" +
            '<div class="learn-grid">';

        cards.forEach(function (card, index) {
            html +=
                '<div class="learn-card" data-index="' + index + '">' +
                    '<div class="learn-icon">' + card.icon + "</div>" +
                    "<h3>" + esc(card.title) + "</h3>" +
                    (card.text ? "<p>" + esc(card.text) + "</p>" : "") +
                    (card.badge ? '<span class="count-badge">' + esc(card.badge) + "</span>" : "") +
                "</div>";
        });

        html += "</div>";

        content.innerHTML = html;

        content.querySelectorAll(".learn-card").forEach(function (el) {
            el.addEventListener("click", function () {
                onClick(cards[Number(el.getAttribute("data-index"))]);
            });
        });
    }

    function emptyMessage(title, text) {
        content.innerHTML =
            '<div class="empty-state"><h3>' + esc(title) + "</h3><p>" + esc(text) + "</p></div>";
    }

    function renderCategories() {

        var groups = {};

        courses.forEach(function (c) {
            var key = String(c.category || "other").toLowerCase();
            groups[key] = (groups[key] || 0) + 1;
        });

        var keys = Object.keys(groups).sort(function (a, b) {
            var ia = CATEGORY_ORDER.indexOf(a);
            var ib = CATEGORY_ORDER.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

        if (!keys.length) {

            content.innerHTML =
                '<div class="empty-state">' +
                    "<h3>You are not enrolled in any course yet</h3>" +
                    "<p>Once you are enrolled in a course, it will appear here.</p>" +
                    '<a href="courses.html" class="btn btn-primary">Browse Courses</a>' +
                "</div>";

            return;
        }

        setCards(
            "Choose Category",
            "Select your programme.",
            keys.map(function (k) {
                return { key: k, icon: "🎓", title: categoryName(k), badge: groups[k] + " course" + (groups[k] > 1 ? "s" : "") };
            }),
            function (card) {
                go({ category: card.key, term: "", course: "", unit: "" });
            }
        );
    }

    function renderTerms() {

        var groups = {};

        courses.forEach(function (c) {
            if (String(c.category || "other").toLowerCase() !== state.category) return;
            var key = termKey(c);
            groups[key] = (groups[key] || 0) + 1;
        });

        var keys = Object.keys(groups).sort(function (a, b) {
            return termOrder(a) - termOrder(b);
        });

        if (!keys.length) {
            emptyMessage("No courses found", "There are no courses in this category yet.");
            return;
        }

        // only one choice (for example no semester set) - skip this step
        if (keys.length === 1) {
            state.term = keys[0];
            history.replaceState({}, "", buildQuery(state));
            render();
            return;
        }

        setCards(
            categoryName(state.category),
            "Select your year or semester.",
            keys.map(function (k) {
                return { key: k, icon: k === "none" ? "📚" : "🗓️", title: termLabel(k), badge: groups[k] + " course" + (groups[k] > 1 ? "s" : "") };
            }),
            function (card) {
                go({ category: state.category, term: card.key, course: "", unit: "" });
            }
        );
    }

    function renderCourses() {

        var list = courses.filter(function (c) {
            return String(c.category || "other").toLowerCase() === state.category &&
                   termKey(c) === state.term;
        });

        if (!list.length) {
            emptyMessage("No courses found", "There are no courses here yet.");
            return;
        }

        setCards(
            termLabel(state.term),
            "Select your course.",
            list.map(function (c) {
                return { key: c.id, icon: "📘", title: c.title || c.id, text: c.id };
            }),
            function (card) {
                go({ category: state.category, term: state.term, course: card.key, unit: "" });
            }
        );
    }


    /* ================= UNITS ================= */

    async function loadUnits(courseId) {

        if (unitsCache[courseId]) return unitsCache[courseId];

        var snapshot = await db
            .collection("units")
            .where("courseId", "==", courseId)
            .get();

        var list = [];

        snapshot.forEach(function (doc) {
            var data = doc.data();
            if (data.status === "inactive") return;
            list.push(Object.assign({ id: doc.id }, data));
        });

        list.sort(function (a, b) {
            return (Number(a.unitNumber) || 0) - (Number(b.unitNumber) || 0);
        });

        unitsCache[courseId] = list;

        return list;
    }

    function testUrl(course, unit) {
        return "tests.html?course=" + encodeURIComponent(course.id) +
            (unit ? "&unit=" + encodeURIComponent(unit.unitNumber) : "");
    }

    function notesUrl(course, unit) {
        return "notes.html?course=" + encodeURIComponent(course.id) +
            (unit ? "&unit=" + encodeURIComponent(unit.unitNumber) : "");
    }

    function actionsHtml(course, unit) {

        var hasPlaylist = !!playlistEmbedUrl(course.playlistUrl);

        return '' +
            '<div class="unit-actions">' +
                '<a class="btn btn-primary" href="' + esc(testUrl(course, unit)) + '">📝 Online Test</a>' +
                (hasPlaylist
                    ? '<button class="btn btn-secondary" type="button" id="playlistBtn">📺 Course Video Playlist</button>'
                    : '<button class="btn btn-secondary" type="button" disabled>📺 Playlist Coming Soon</button>') +
                '<a class="btn btn-primary" href="' + esc(notesUrl(course, unit)) + '">📖 Notes</a>' +
            '</div>' +
            '<div class="playlist-box" id="playlistBox" style="display:none;"></div>';
    }

    function bindPlaylist(course) {

        var btn = document.getElementById("playlistBtn");
        var box = document.getElementById("playlistBox");

        if (!btn || !box) return;

        btn.addEventListener("click", function () {

            if (box.innerHTML) {
                box.style.display = box.style.display === "none" ? "block" : "none";
                return;
            }

            box.innerHTML =
                '<div class="video-frame"><iframe src="' + esc(playlistEmbedUrl(course.playlistUrl)) +
                '" title="Course playlist" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' +
                '<p style="margin-top:8px;"><a href="' + esc(course.playlistUrl) +
                '" target="_blank" rel="noopener">Open playlist on YouTube</a></p>';

            box.style.display = "block";
        });
    }

    async function renderUnits() {

        var course = courseById(state.course);

        if (!course) {
            emptyMessage("Course not found", "This course is not available.");
            return;
        }

        content.innerHTML =
            '<div class="empty-state"><div class="loading-spinner"></div><p>Loading units...</p></div>';

        var units;

        try {
            units = await loadUnits(course.id);
        } catch (error) {
            console.error(error);
            content.innerHTML =
                '<div class="alert alert-error">Unable to load units. ' + esc(error.message) + "</div>";
            return;
        }

        var html =
            '<div class="learn-title"><h2>' + esc(course.title || course.id) + "</h2>" +
            "<p>" + esc(course.description || "") + "</p></div>" +
            actionsHtml(course, null);

        if (!units.length) {
            html += '<div class="empty-state"><h3>No units yet</h3><p>Units and PDFs will appear here soon.</p></div>';
            content.innerHTML = html;
            bindPlaylist(course);
            return;
        }

        html += '<div class="learn-grid">';

        units.forEach(function (unit, index) {
            html +=
                '<div class="learn-card" data-index="' + index + '">' +
                    '<div class="learn-icon">📄</div>' +
                    "<h3>Unit " + esc(unit.unitNumber) + "</h3>" +
                    "<p>" + esc(unit.title || "") + "</p>" +
                    '<span class="count-badge">View PDF</span>' +
                "</div>";
        });

        html += "</div>";

        content.innerHTML = html;

        bindPlaylist(course);

        content.querySelectorAll(".learn-card").forEach(function (el) {
            el.addEventListener("click", function () {
                var unit = units[Number(el.getAttribute("data-index"))];
                go({ category: state.category, term: state.term, course: state.course, unit: unit.id });
            });
        });
    }

    async function renderUnitView() {

        var course = courseById(state.course);

        if (!course) {
            emptyMessage("Course not found", "This course is not available.");
            return;
        }

        var units;

        try {
            units = await loadUnits(course.id);
        } catch (error) {
            console.error(error);
            content.innerHTML =
                '<div class="alert alert-error">Unable to load unit. ' + esc(error.message) + "</div>";
            return;
        }

        var index = -1;

        units.forEach(function (u, i) {
            if (u.id === state.unit) index = i;
        });

        if (index === -1) {
            emptyMessage("Unit not found", "This unit is not available.");
            return;
        }

        var unit = units[index];

        var prev = units[index - 1];
        var next = units[index + 1];

        var embed = pdfEmbedUrl(unit.pdfUrl);

        content.innerHTML =
            '<div class="learn-title"><h2>Unit ' + esc(unit.unitNumber) + ": " + esc(unit.title || "") + "</h2>" +
            "<p>" + esc(course.title || course.id) + "</p></div>" +

            '<div class="pdf-viewer"><iframe src="' + esc(embed) + '" title="PDF" allowfullscreen></iframe></div>' +

            '<p style="margin-top:10px;"><a href="' + esc(unit.pdfUrl) +
            '" target="_blank" rel="noopener" class="btn btn-secondary btn-small">Open PDF in new tab</a></p>' +

            actionsHtml(course, unit) +

            '<div class="unit-nav">' +
                (prev ? '<button class="btn btn-secondary" id="prevUnit" type="button">← Unit ' + esc(prev.unitNumber) + "</button>" : "<span></span>") +
                (next ? '<button class="btn btn-primary" id="nextUnit" type="button">Unit ' + esc(next.unitNumber) + " →</button>" : "<span></span>") +
            "</div>";

        bindPlaylist(course);

        var prevBtn = document.getElementById("prevUnit");
        var nextBtn = document.getElementById("nextUnit");

        if (prevBtn) {
            prevBtn.addEventListener("click", function () {
                go({ category: state.category, term: state.term, course: state.course, unit: prev.id });
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", function () {
                go({ category: state.category, term: state.term, course: state.course, unit: next.id });
            });
        }
    }


    /* ================= MAIN RENDER ================= */

    async function render() {

        renderBreadcrumb();

        // link to a course the student is not enrolled in

        if (state.course && !courseById(state.course)) {

            content.innerHTML =
                '<div class="empty-state">' +
                    "<h3>You are not enrolled in this course</h3>" +
                    "<p>Please contact the admin to get enrolled in <strong>" + esc(state.course) + "</strong>.</p>" +
                    '<a href="learn.html" class="btn btn-primary">My Courses</a>' +
                "</div>";

            return;
        }

        if (!state.category) return renderCategories();
        if (!state.term) return renderTerms();
        if (!state.course) return renderCourses();
        if (!state.unit) return renderUnits();

        return renderUnitView();
    }


    /* ================= START ================= */

    async function loadCourses(user) {

        courses = [];

        // Admin can see every active course

        var adminDoc = await db.collection("admins").doc(user.uid).get();

        if (adminDoc.exists) {

            var all = await db
                .collection("courses")
                .where("status", "==", "active")
                .get();

            all.forEach(function (doc) {
                courses.push(Object.assign({ id: doc.id }, doc.data()));
            });

        } else {

            // Student sees only the courses he/she is enrolled in

            var studentDoc = await db.collection("students").doc(user.uid).get();

            var ids =
                studentDoc.exists
                    ? (studentDoc.data().enrolledCourses || [])
                    : [];

            var docs = await Promise.all(
                ids.map(function (id) {
                    return db.collection("courses").doc(id).get();
                })
            );

            docs.forEach(function (doc) {

                if (doc.exists && doc.data().status === "active") {
                    courses.push(Object.assign({ id: doc.id }, doc.data()));
                }

            });
        }

        courses.sort(function (a, b) {
            return String(a.title || a.id).localeCompare(String(b.title || b.id));
        });
    }

    document.addEventListener("DOMContentLoaded", function () {

        if (typeof auth === "undefined" || typeof db === "undefined") {
            content.innerHTML =
                '<div class="alert alert-error">Firebase connection error. Please check firebase-config.js.</div>';
            return;
        }

        auth.onAuthStateChanged(async function (user) {

            if (!user) {

                window.location.href =
                    "login.html?next=" +
                    encodeURIComponent("learn.html" + window.location.search);

                return;
            }

            try {

                await loadCourses(user);

                readState();

                render();

            } catch (error) {

                console.error("Learn page error:", error);

                content.innerHTML =
                    '<div class="alert alert-error">Unable to load courses. ' + esc(error.message) + "</div>";
            }
        });

        window.addEventListener("popstate", function () {
            readState();
            render();
        });
    });

})();