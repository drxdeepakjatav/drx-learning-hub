/* =========================================================
   DRx LEARNING HUB
   MASTER JAVASCRIPT
   One JS file for the complete website
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    /* =========================
       1. MOBILE MENU
       ========================= */

    const menuToggle = document.querySelector(".menu-toggle");
    const mainNav = document.querySelector(".main-nav");

    if (menuToggle && mainNav) {

        menuToggle.addEventListener("click", function () {
            mainNav.classList.toggle("show");

            if (mainNav.classList.contains("show")) {
                menuToggle.innerHTML = "✕";
            } else {
                menuToggle.innerHTML = "☰";
            }
        });

        /* Close menu after clicking a link */

        const navLinks = mainNav.querySelectorAll("a");

        navLinks.forEach(function (link) {

            link.addEventListener("click", function () {

                mainNav.classList.remove("show");
                menuToggle.innerHTML = "☰";

            });

        });
    }


    /* =========================
       2. ACTIVE NAVIGATION
       ========================= */

    function pageName(value) {

        return String(value || "")
            .split("#")[0]
            .split("?")[0]
            .split("/")
            .pop()
            .replace(/\.html$/, "") || "index";
    }

    const currentPage =
        pageName(window.location.pathname);

    const navigationLinks =
        document.querySelectorAll(".main-nav a");

    navigationLinks.forEach(function (link) {

        const href = link.getAttribute("href");

        if (
            href &&
            href !== "#" &&
            href.indexOf("#") === -1 &&
            pageName(href) === currentPage
        ) {
            link.classList.add("active");
        }

    });


    /* =========================
       3. CURRENT YEAR
       ========================= */

    const yearElements =
        document.querySelectorAll(".current-year");

    yearElements.forEach(function (element) {
        element.textContent = new Date().getFullYear();
    });


    /* =========================
       4. SEARCH FUNCTION
       ========================= */

    const searchInput =
        document.querySelector("#siteSearch");

    const searchableItems =
        document.querySelectorAll(".search-item");

    if (searchInput && searchableItems.length > 0) {

        searchInput.addEventListener("input", function () {

            const searchText =
                searchInput.value.toLowerCase().trim();

            searchableItems.forEach(function (item) {

                const itemText =
                    item.textContent.toLowerCase();

                if (itemText.includes(searchText)) {
                    item.style.display = "";
                } else {
                    item.style.display = "none";
                }

            });

        });

    }


    /* =========================
       5. PASSWORD SHOW / HIDE
       ========================= */

    const passwordToggles =
        document.querySelectorAll(".password-toggle");

    passwordToggles.forEach(function (button) {

        button.addEventListener("click", function () {

            const input =
                document.querySelector(
                    button.dataset.target
                );

            if (!input) return;

            if (input.type === "password") {

                input.type = "text";
                button.textContent = "Hide";

            } else {

                input.type = "password";
                button.textContent = "Show";

            }

        });

    });


    /* =========================
       6. MODAL
       ========================= */

    const modalOpenButtons =
        document.querySelectorAll("[data-modal-open]");

    const modalCloseButtons =
        document.querySelectorAll("[data-modal-close]");

    modalOpenButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const modalId =
                button.dataset.modalOpen;

            const modal =
                document.getElementById(modalId);

            if (modal) {
                modal.classList.add("show");
            }

        });

    });


    modalCloseButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const modal =
                button.closest(".modal");

            if (modal) {
                modal.classList.remove("show");
            }

        });

    });


    /* Close modal by clicking outside */

    document.querySelectorAll(".modal").forEach(function (modal) {

        modal.addEventListener("click", function (event) {

            if (event.target === modal) {
                modal.classList.remove("show");
            }

        });

    });


    /* =========================
       7. LOGIN FORM
       ========================= */

    const loginForm =
        document.querySelector("#loginForm");

    if (loginForm) {

        loginForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const email =
                document.querySelector("#loginEmail")?.value.trim();

            const password =
                document.querySelector("#loginPassword")?.value;

            if (!email || !password) {

                showMessage(
                    "Please enter email and password.",
                    "danger"
                );

                return;
            }

            /*
              IMPORTANT:
              This is currently frontend/demo logic.

              Real secure login will be connected
              to backend/database later.
            */

            showMessage(
                "Login system is ready for backend connection.",
                "info"
            );

        });

    }


    /* =========================
       8. SIGNUP FORM
       ========================= */

    const signupForm =
        document.querySelector("#signupForm");

    if (signupForm) {

        signupForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const name =
                document.querySelector("#signupName")?.value.trim();

            const email =
                document.querySelector("#signupEmail")?.value.trim();

            const password =
                document.querySelector("#signupPassword")?.value;

            const confirmPassword =
                document.querySelector("#confirmPassword")?.value;

            if (!name || !email || !password) {

                showMessage(
                    "Please fill all required fields.",
                    "danger"
                );

                return;
            }

            if (password !== confirmPassword) {

                showMessage(
                    "Passwords do not match.",
                    "danger"
                );

                return;
            }

            showMessage(
                "Registration form is ready for backend connection.",
                "success"
            );

        });

    }


    /* =========================
       9. COURSE FILTER
       ========================= */

    const courseFilter =
        document.querySelector("#courseFilter");

    const courseItems =
        document.querySelectorAll(".course-item");

    if (courseFilter && courseItems.length > 0) {

        courseFilter.addEventListener("change", function () {

            const selected =
                courseFilter.value.toLowerCase();

            courseItems.forEach(function (course) {

                const category =
                    course.dataset.category?.toLowerCase();

                if (
                    selected === "all" ||
                    !selected ||
                    category === selected
                ) {
                    course.style.display = "";
                } else {
                    course.style.display = "none";
                }

            });

        });

    }


    /* =========================
       10. FAQ / ACCORDION
       ========================= */

    const accordionButtons =
        document.querySelectorAll(".accordion-button");

    accordionButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const content =
                button.nextElementSibling;

            if (!content) return;

            content.classList.toggle("hidden");

        });

    });


    /* =========================
       11. TEST SYSTEM
       ========================= */

    const testForm =
        document.querySelector("#testForm");

    if (testForm) {

        testForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const questions =
                testForm.querySelectorAll(
                    ".question-block"
                );

            let total = questions.length;
            let correct = 0;
            let attempted = 0;

            questions.forEach(function (question) {

                const correctAnswer =
                    question.dataset.answer;

                const selected =
                    question.querySelector(
                        "input[type='radio']:checked"
                    );

                if (selected) {

                    attempted++;

                    if (
                        selected.value === correctAnswer
                    ) {
                        correct++;
                    }

                }

            });

            const wrong =
                attempted - correct;

            const percentage =
                total > 0
                    ? Math.round((correct / total) * 100)
                    : 0;

            const resultBox =
                document.querySelector("#testResult");

            if (resultBox) {

                resultBox.innerHTML = `
                    <h3>Test Result</h3>
                    <p>Total Questions: ${total}</p>
                    <p>Attempted: ${attempted}</p>
                    <p>Correct: ${correct}</p>
                    <p>Wrong: ${wrong}</p>
                    <p>Score: ${percentage}%</p>
                `;

                resultBox.classList.remove("hidden");
            }

        });

    }


    /* =========================
       12. CONFIRM DELETE
       ========================= */

    const deleteButtons =
        document.querySelectorAll(".delete-btn");

    deleteButtons.forEach(function (button) {

        button.addEventListener("click", function (event) {

            const confirmed =
                confirm(
                    "Are you sure you want to delete this item?"
                );

            if (!confirmed) {
                event.preventDefault();
            }

        });

    });


    /* =========================
       13. AUTO HIDE ALERT
       ========================= */

    /* Only alerts that are already visible are auto-hidden.
       Hidden message boxes (login, signup, forms) must stay in the
       page so that errors can be shown later. */

    const alerts =
        document.querySelectorAll(".alert");

    alerts.forEach(function (alertBox) {

        if (window.getComputedStyle(alertBox).display === "none") {
            return;
        }

        setTimeout(function () {

            alertBox.style.opacity = "0";

            setTimeout(function () {
                alertBox.style.display = "none";
                alertBox.style.opacity = "1";
            }, 400);

        }, 5000);

    });

});


/* =========================================================
   COMMON MESSAGE FUNCTION
   ========================================================= */

function showMessage(message, type = "info") {

    let messageBox =
        document.querySelector("#globalMessage");

    if (!messageBox) {

        messageBox =
            document.createElement("div");

        messageBox.id = "globalMessage";

        messageBox.style.position = "fixed";
        messageBox.style.top = "90px";
        messageBox.style.right = "20px";
        messageBox.style.zIndex = "9999";
        messageBox.style.maxWidth = "350px";

        document.body.appendChild(messageBox);
    }

    messageBox.className =
        `alert alert-${type}`;

    messageBox.textContent =
        message;

    messageBox.style.opacity = "1";

    setTimeout(function () {

        messageBox.style.opacity = "0";

    }, 4000);

}


/* =========================================================
   YOUTUBE URL HELPER
   ========================================================= */

function getYouTubeEmbedUrl(url) {

    if (!url) return "";

    let videoId = "";

    /*
      Standard YouTube URL
      https://www.youtube.com/watch?v=VIDEO_ID
    */

    if (url.includes("watch?v=")) {

        videoId =
            url.split("watch?v=")[1]
            .split("&")[0];

    }

    /*
      Short URL
      https://youtu.be/VIDEO_ID
    */

    else if (url.includes("youtu.be/")) {

        videoId =
            url.split("youtu.be/")[1]
            .split("?")[0];

    }

    /*
      Already embedded URL
    */

    else if (url.includes("/embed/")) {

        videoId =
            url.split("/embed/")[1]
            .split("?")[0];

    }

    if (!videoId) return "";

    return `https://www.youtube.com/embed/${videoId}`;

}


/* =========================================================
   OPEN YOUTUBE VIDEO
   ========================================================= */

function openYouTubeVideo(url) {

    const embedUrl =
        getYouTubeEmbedUrl(url);

    if (!embedUrl) {

        alert("Invalid YouTube URL.");

        return;
    }

    window.open(
        embedUrl,
        "_blank",
        "noopener,noreferrer"
    );

}


/* =========================================================
   ESCAPE HTML (global helper used by many pages)
   ========================================================= */

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



/* =========================================================
   SITE WIDE MENU, FOOTER AND LOGIN LINK
   Keeps every page consistent without editing each page.
   ========================================================= */

(function () {

    var isAdmin = /\/admin(\/|$)/.test(window.location.pathname);

    var prefix = isAdmin ? "../" : "";

    function baseName(href) {

        return String(href || "")
            .split("?")[0]
            .split("/")
            .pop()
            .replace(/\.html$/, "");
    }

    function makeLink(text, href) {

        var a = document.createElement("a");

        a.href = href;
        a.textContent = text;

        return a;
    }


    /* ---------- student site menu ---------- */

    var SITE_MENU = [
        ["Home", "index.html"],
        ["Courses", "courses.html"],
        ["Learn", "learn.html"],
        ["Videos", "videos.html"],
        ["Notes", "notes.html"],
        ["Tests", "tests.html"],
        ["About", "about.html"],
        ["Contact", "contact.html"]
    ];

    function buildSiteMenu() {

        var nav = document.querySelector(".main-nav");

        if (!nav) return;

        // old links that pointed to the About section of the home page
        Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {

            var href = a.getAttribute("href") || "";

            if (/^(index(\.html)?)?#about$/.test(href) || /(^|\/)about(\.html)?$/.test(href)) {

                a.setAttribute("href", prefix + "about.html");
            }
        });

        var found = {};

        Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {

            var name = baseName(a.getAttribute("href"));

            if (!name) return;

            if (found[name]) {

                // the same page twice in the menu - keep only the first one
                a.parentNode.removeChild(a);

            } else {

                found[name] = a;
            }
        });

        var anchorPoint =
            nav.querySelector(".nav-login") ||
            nav.querySelector("button") ||
            null;

        SITE_MENU.forEach(function (item, index) {

            var name = baseName(item[1]);

            if (found[name]) return;

            var link = makeLink(item[0], prefix + item[1]);

            // put it before the next menu item that already exists
            var before = null;

            for (var i = index + 1; i < SITE_MENU.length; i++) {

                var later = found[baseName(SITE_MENU[i][1])];

                if (later) { before = later; break; }
            }

            nav.insertBefore(link, before || anchorPoint);

            found[name] = link;
        });
    }


    /* ---------- footer legal links ---------- */

    function buildFooter() {

        var footer = document.querySelector(".site-footer");

        if (!footer || footer.querySelector('a[href$="terms.html"]')) return;

        var row = document.createElement("div");

        row.className = "footer-legal";

        [
            ["Privacy Policy", "privacy-policy.html"],
            ["Terms & Conditions", "terms.html"],
            ["Refund Policy", "refund-policy.html"],
            ["About", "about.html"],
            ["Contact", "contact.html"]
        ].forEach(function (item) {
            row.appendChild(makeLink(item[0], prefix + item[1]));
        });

        var bottom = footer.querySelector(".footer-bottom");

        if (bottom && bottom.parentNode) {
            bottom.parentNode.insertBefore(row, bottom);
        } else {
            (footer.querySelector(".container") || footer).appendChild(row);
        }
    }


    /* ---------- keep the student logged in on EVERY page ----------
       Pages that do not load Firebase get it loaded here, so the menu
       shows "My Profile" + "Logout" after login on all pages.        */

    var FIREBASE_URL = "https://www.gstatic.com/firebasejs/10.12.2/";

    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyCWZpckA8cwboV6RVHAN57p7b8vXUByKNc",
        authDomain: "drx-learning-hub-2.firebaseapp.com",
        projectId: "drx-learning-hub-2",
        storageBucket: "drx-learning-hub-2.firebasestorage.app",
        messagingSenderId: "748103606890",
        appId: "1:748103606890:web:6ada6d6a8ac94217532013"
    };

    function loadScript(src, done) {

        var tag = document.createElement("script");

        tag.src = src;

        tag.onload = function () { done(null); };

        tag.onerror = function () { done(new Error("load failed")); };

        document.head.appendChild(tag);
    }

    function withAuth(callback) {

        function ready() {

            try {

                if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

                callback(firebase.auth());

            } catch (error) {

                console.warn("Login check:", error.message);
            }
        }

        if (typeof firebase !== "undefined" && typeof firebase.auth === "function") {
            ready();
            return;
        }

        if (typeof firebase === "undefined") {

            loadScript(FIREBASE_URL + "firebase-app-compat.js", function (error) {

                if (error) return;

                loadScript(FIREBASE_URL + "firebase-auth-compat.js", function (error2) {
                    if (!error2) ready();
                });
            });

            return;
        }

        loadScript(FIREBASE_URL + "firebase-auth-compat.js", function (error) {
            if (!error) ready();
        });
    }

    /* ---------- profile icon (photo or first letter of the name) ---------- */

    var FIRESTORE_STUDENT_URL =
        "https://firestore.googleapis.com/v1/projects/" + FIREBASE_CONFIG.projectId +
        "/databases/(default)/documents/students/";

    var AVATAR_REFRESH_MS = 10 * 60 * 1000;

    function avatarCacheKey(uid) {
        return "drx_avatar_" + uid;
    }

    function readAvatarCache(uid) {

        try {
            return JSON.parse(localStorage.getItem(avatarCacheKey(uid)) || "null");
        } catch (e) {
            return null;
        }
    }

    function writeAvatarCache(uid, photo, name) {

        try {

            localStorage.setItem(avatarCacheKey(uid), JSON.stringify({
                photo: photo || "",
                name: name || "",
                time: Date.now()
            }));

        } catch (e) { }
    }

    function paintAvatar(link, user, cache) {

        var name = (cache && cache.name) || user.displayName || user.email || "S";

        var letter = (String(name).trim().charAt(0) || "S").toUpperCase();

        var photo = cache && /^data:image\//.test(cache.photo || "") ? cache.photo : "";

        link.classList.add("nav-avatar");

        link.setAttribute("title", "My Profile");

        link.setAttribute("aria-label", "My Profile");

        link.setAttribute("href", prefix + "student-profile.html");

        link.textContent = "";

        var circle = document.createElement("span");

        circle.className = "avatar-circle";

        if (photo) {

            circle.style.backgroundImage = "url('" + photo + "')";

        } else {

            circle.textContent = letter;
        }

        link.appendChild(circle);
    }

    // read the name and photo from the student's profile (only now and then)
    async function refreshAvatar(user, link) {

        var cache = readAvatarCache(user.uid);

        if (cache && Date.now() - cache.time < AVATAR_REFRESH_MS) return;

        try {

            var token = await user.getIdToken();

            var response = await fetch(FIRESTORE_STUDENT_URL + user.uid, {
                headers: { Authorization: "Bearer " + token }
            });

            if (!response.ok) return;

            var doc = await response.json();

            var fields = doc.fields || {};

            writeAvatarCache(
                user.uid,
                fields.photo && fields.photo.stringValue,
                fields.name && fields.name.stringValue
            );

            paintAvatar(link, user, readAvatarCache(user.uid));

        } catch (error) {

            console.warn("Avatar:", error.message);
        }
    }

    function buildLoginLink() {

        var nav = document.querySelector(".main-nav");

        if (!nav) return;

        // the Login link, or on student pages the Profile link
        var link =
            nav.querySelector(".nav-login") ||
            nav.querySelector('a[href$="student-profile.html"]');

        if (!link) return;

        var original = link.textContent;

        var originalHref = link.getAttribute("href");

        withAuth(function (auth) {

            var currentUser = null;

            // the profile page tells us when the photo changed
            window.addEventListener("drx-avatar", function () {

                if (currentUser) paintAvatar(link, currentUser, readAvatarCache(currentUser.uid));
            });

            auth.onAuthStateChanged(function (user) {

                currentUser = user;

                var logout = nav.querySelector(".nav-logout");

                if (user) {

                    paintAvatar(link, user, readAvatarCache(user.uid));

                    refreshAvatar(user, link);

                    // pages that already have their own Logout button keep it
                    if (!logout && !nav.querySelector("#logoutBtn")) {

                        logout = makeLink("Logout", "#");

                        logout.className = "nav-logout";

                        logout.addEventListener("click", function (event) {

                            event.preventDefault();

                            auth.signOut().then(function () {
                                window.location.href = prefix + "index.html";
                            });
                        });

                        link.parentNode.insertBefore(logout, link.nextSibling);
                    }

                } else {

                    link.classList.remove("nav-avatar");

                    link.removeAttribute("title");

                    link.removeAttribute("aria-label");

                    link.textContent = original;

                    link.setAttribute("href", originalHref);

                    if (logout) logout.parentNode.removeChild(logout);
                }
            });
        });
    }


    /* ---------- admin menu ---------- */

    var ADMIN_MENU = [
        ["Dashboard", "dashboard.html"],
        ["Courses", "courses.html"],
        ["Units", "units.html"],
        ["Videos", "videos.html"],
        ["Notes", "notes.html"],
        ["Tests", "tests.html"],
        ["Students", "students.html"],
        ["Enrollments", "enrollments.html"],
        ["Requests", "requests.html"],
        ["Payments", "payments.html"],
        ["Notifications", "notifications.html"],
        ["Messages", "messages.html"],
        ["Results", "results.html"]
    ];

    function buildAdminMenu() {

        var nav = document.querySelector(".main-nav");

        if (!nav) return;

        var current = baseName(window.location.pathname) || "dashboard";

        // keep the Logout button (it already has its click handler)
        var keep = nav.querySelector("button");

        Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
            a.parentNode.removeChild(a);
        });

        ADMIN_MENU.forEach(function (item) {

            var link = makeLink(item[0], item[1]);

            if (baseName(item[1]) === current) link.className = "active";

            nav.insertBefore(link, keep || null);
        });

        var site = makeLink("View Site", "../index.html");

        nav.insertBefore(site, keep || null);
    }


    document.addEventListener("DOMContentLoaded", function () {

        if (isAdmin) {

            // the login page of the admin has no menu to rebuild
            if (!/admin-login/.test(window.location.pathname)) buildAdminMenu();

        } else {

            buildSiteMenu();
            buildFooter();
            buildLoginLink();
        }
    });

})();



/* =========================================================
   NOTICE LINE (moving announcements below the header)
   ========================================================= */

(function () {

    if (/\/admin(\/|$)/.test(window.location.pathname)) return;

    var me = document.currentScript;

    var src = me && me.src
        ? me.src.replace(/script\.js(\?.*)?$/, "ticker.js")
        : "ticker.js";

    var tag = document.createElement("script");

    tag.src = src;

    tag.defer = true;

    document.head.appendChild(tag);

})();
