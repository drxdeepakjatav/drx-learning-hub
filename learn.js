/* =========================================================
   DRx LEARNING HUB - LEARN PAGE
   Category > Semester/Year > Course > Unit > PDF

   Free / Paid:
   - Free course          : every unit open for logged in students
   - Paid course          : first N units free (freeUnits),
                            other units open after enrollment
   - Admin                : everything open
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
    var enrolled = {};
    var isAdmin = false;

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


    /* ================= FREE / PAID RULES ================= */

    function freeLimit(course) {

        if (course.accessType === "free") return Infinity;

        return Number(course.freeUnits) || 0;
    }

    // whole course open (free course, enrolled student or admin)
    function courseUnlocked(course) {

        return isAdmin || !!enrolled[course.id] || course.accessType === "free";
    }

    function unitUnlocked(course, unit) {

        return courseUnlocked(course) ||
               Number(unit.unitNumber) <= freeLimit(course);
    }

    function priceLabel(course) {

        if (course.accessType === "free") return "FREE";

        var price = Number(course.price) || 0;

        return price ? "₹" + price : "Paid";
    }

    function courseBadge(course) {

        if (isAdmin) return priceLabel(course);

        if (enrolled[course.id]) return "Enrolled ✓";

        var text = priceLabel(course);

        var free = Number(course.freeUnits) || 0;

        if (course.accessType !== "free" && free > 0) {
            text += " • first " + free + " unit" + (free > 1 ? "s" : "") + " free";
        }

        return text;
    }

    function buyBoxHtml(course) {

        var pay = window.DRX_PAYMENT || {};

        var price = Number(course.price) || 0;

        var title = course.title || course.id;

        var free = Number(course.freeUnits) || 0;

        var html =
            '<div class="buy-box">' +
                "<h3>🔒 Enroll in " + esc(title) + "</h3>" +
                "<p>" +
                    (price ? "Course fee: <strong>₹" + price + "</strong>. " : "This is a paid course. ") +
                    (free > 0 ? "The first " + free + " unit" + (free > 1 ? "s are" : " is") + " free to preview." : "") +
                "</p>" +
                "<ol>" +
                    "<li>Pay the course fee" + (pay.upiId ? " using UPI" : "") + ".</li>" +
                    "<li>Send your payment screenshot or UTR number through the Contact page.</li>" +
                    "<li>We enroll you, and all units open in your account.</li>" +
                "</ol>";

        html += '<div class="buy-actions">';

        if (pay.upiId && price) {

            var upiLink =
                "upi://pay?pa=" + encodeURIComponent(pay.upiId) +
                "&pn=" + encodeURIComponent(pay.payeeName || "DRx Learning Hub") +
                "&am=" + price +
                "&cu=INR&tn=" + encodeURIComponent("Course " + course.id);

            html += '<a class="btn btn-primary" href="' + esc(upiLink) + '">Pay ₹' + price + ' with UPI</a>';
        }

        var contactUrl =
            "contact.html?subject=" + encodeURIComponent("Course Enrollment") +
            "&message=" + encodeURIComponent(
                "I want to enroll in " + title + " (" + course.id + ")" +
                (price ? ", fee ₹" + price : "") +
                ".\nPayment UTR / reference: "
            );

        html += '<a class="btn btn-secondary" href="' + esc(contactUrl) + '">I have paid / Contact to enroll</a>';

        html += "</div>";

        if (pay.upiId) {
            html += '<p class="buy-note">UPI ID: <strong>' + esc(pay.upiId) + "</strong>" +
                    " (the UPI button works on mobile phones)</p>";
        }

        if (pay.qrImage) {
            html += '<img class="upi-qr" src="' + esc(pay.qrImage) + '" alt="UPI QR code">';
        }

        if (pay.note) {
            html += '<p class="buy-note">' + esc(pay.note) + "</p>";
        }

        html += "</div>";

        return html;
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
            emptyMessage("No courses yet", "Courses will appear here when admin adds them.");
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
                return {
                    key: c.id,
                    icon: enrolled[c.id] ? "✅" : (c.accessType === "free" ? "🆓" : "📘"),
                    title: c.title || c.id,
                    text: c.id,
                    badge: courseBadge(c)
                };
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

        var playlistButton;

        if (!hasPlaylist) {

            playlistButton =
                '<button class="btn btn-secondary" type="button" disabled>📺 Playlist Coming Soon</button>';

        } else if (!courseUnlocked(course)) {

            playlistButton =
                '<button class="btn btn-secondary" type="button" disabled>🔒 Playlist (enrolled students)</button>';

        } else {

            playlistButton =
                '<button class="btn btn-secondary" type="button" id="playlistBtn">📺 Course Video Playlist</button>';
        }

        return '' +
            '<div class="unit-actions">' +
                '<a class="btn btn-primary" href="' + esc(testUrl(course, unit)) + '">📝 Online Test</a>' +
                playlistButton +
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
            "<p>" + esc(course.description || "") + "</p>" +
            '<span class="count-badge">' + esc(courseBadge(course)) + "</span></div>";

        if (!courseUnlocked(course)) {
            html += buyBoxHtml(course);
        }

        html += actionsHtml(course, null);

        if (!units.length) {
            html += '<div class="empty-state"><h3>No units yet</h3><p>Units and PDFs will appear here soon.</p></div>';
            content.innerHTML = html;
            bindPlaylist(course);
            return;
        }

        html += '<div class="learn-grid">';

        units.forEach(function (unit, index) {

            var open = unitUnlocked(course, unit);

            var label = !open
                ? "🔒 Locked"
                : (courseUnlocked(course) ? "View PDF" : "🆓 Free preview");

            html +=
                '<div class="learn-card' + (open ? "" : " locked") + '" data-index="' + index + '">' +
                    '<div class="learn-icon">' + (open ? "📄" : "🔒") + "</div>" +
                    "<h3>Unit " + esc(unit.unitNumber) + "</h3>" +
                    "<p>" + esc(unit.title || "") + "</p>" +
                    '<span class="count-badge">' + label + "</span>" +
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

        var header =
            '<div class="learn-title"><h2>Unit ' + esc(unit.unitNumber) + ": " + esc(unit.title || "") + "</h2>" +
            "<p>" + esc(course.title || course.id) + "</p></div>";

        var viewer = "";

        if (!unitUnlocked(course, unit)) {

            viewer =
                '<div class="lock-note">🔒 This unit is available to enrolled students.</div>' +
                buyBoxHtml(course);

        } else {

            var pdfUrl = "";
            var problem = "";

            try {

                var fileDoc = await db.collection("unitFiles").doc(unit.id).get();

                if (fileDoc.exists) {
                    pdfUrl = fileDoc.data().pdfUrl || "";
                }

                if (!pdfUrl) {
                    problem = "The PDF for this unit has not been added yet.";
                }

            } catch (error) {

                console.error(error);

                problem = "permission";
            }

            if (problem === "permission") {

                viewer =
                    '<div class="lock-note">🔒 This unit is available to enrolled students.</div>' +
                    buyBoxHtml(course);

            } else if (problem) {

                viewer = '<div class="empty-state"><h3>PDF not available</h3><p>' + esc(problem) + "</p></div>";

            } else {

                viewer =
                    (courseUnlocked(course) ? "" : '<p class="free-tag">🆓 Free preview unit</p>') +
                    '<div class="pdf-viewer"><iframe src="' + esc(pdfEmbedUrl(pdfUrl)) + '" title="PDF" allowfullscreen></iframe></div>' +
                    '<p style="margin-top:10px;"><a href="' + esc(pdfUrl) +
                    '" target="_blank" rel="noopener" class="btn btn-secondary btn-small">Open PDF in new tab</a></p>';
            }
        }

        content.innerHTML =
            header +
            viewer +
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

        if (state.course && !courseById(state.course)) {

            content.innerHTML =
                '<div class="empty-state">' +
                    "<h3>Course not found</h3>" +
                    "<p>The course <strong>" + esc(state.course) + "</strong> is not available.</p>" +
                    '<a href="learn.html" class="btn btn-primary">All Courses</a>' +
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
        enrolled = {};

        var adminDoc = await db.collection("admins").doc(user.uid).get();

        isAdmin = adminDoc.exists;

        var snapshot = await db
            .collection("courses")
            .where("status", "==", "active")
            .get();

        snapshot.forEach(function (doc) {
            courses.push(Object.assign({ id: doc.id }, doc.data()));
        });

        courses.sort(function (a, b) {
            return String(a.title || a.id).localeCompare(String(b.title || b.id));
        });

        if (!isAdmin) {

            var studentDoc = await db.collection("students").doc(user.uid).get();

            var ids = studentDoc.exists ? (studentDoc.data().enrolledCourses || []) : [];

            ids.forEach(function (id) {
                enrolled[id] = true;
            });
        }
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
