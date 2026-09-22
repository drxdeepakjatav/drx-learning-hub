// ===============================
// DRx Learning Hub - Main JS
// ===============================


// Mobile Menu

const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");

if (menuBtn) {

    menuBtn.addEventListener("click", () => {

        navMenu.classList.toggle("show");

    });

}


// Current Year

const year = document.getElementById("year");

if (year) {

    year.textContent =
        new Date().getFullYear();

}