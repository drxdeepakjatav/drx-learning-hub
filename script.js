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

    const currentPage =
        window.location.pathname.split("/").pop() || "index.html";

    const navigationLinks =
        document.querySelectorAll(".main-nav a");

    navigationLinks.forEach(function (link) {

        const linkPage =
            link.getAttribute("href");

        if (
            linkPage &&
            linkPage !== "#" &&
            linkPage === currentPage
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