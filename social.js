/* =========================================================
   DRx LEARNING HUB - SOCIAL MEDIA LINKS
   Shows the social links in the footer of every page and a
   WhatsApp chat button. The links are written by the admin in
   Admin > Site Settings (document settings/site, field "social").
   ========================================================= */

(function () {

    // same values as firebase-config.js (they are public)
    var PROJECT_ID = "drx-learning-hub-2";
    var API_KEY = "AIzaSyCWZpckA8cwboV6RVHAN57p7b8vXUByKNc";

    // shown even before the admin saves anything
    var DEFAULT_LINKS = { youtube: "https://www.youtube.com/@drxdeepakjatav" };

    var CACHE_KEY = "drx_social_v1";
    var CACHE_MINUTES = 5;

    if (/\/admin(\/|$)/.test(window.location.pathname)) return;


    var NETWORKS = [
        { key: "youtube",   name: "YouTube",   color: "#ff0000",
          svg: '<rect x="4" y="7" width="16" height="10" rx="3" fill="#fff"/><path d="M10.2 9.6v4.8l4.2-2.4z" fill="#ff0000"/>' },
        { key: "instagram", name: "Instagram", color: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)",
          svg: '<rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="16.3" cy="7.7" r="1" fill="#fff"/>' },
        { key: "facebook",  name: "Facebook",  color: "#1877f2",
          svg: '<path fill="#fff" d="M13.3 20v-7h2.3l.4-2.8h-2.7V8.5c0-.8.3-1.3 1.4-1.3H16V4.7c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2H8v2.8h2.4v7z"/>' },
        { key: "whatsapp",  name: "WhatsApp",  color: "#25d366",
          svg: '<path fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 19l1-3.6A7.5 7.5 0 1 1 8.6 18z"/><path fill="#fff" d="M9.4 8.8c.2-.4.5-.4.7-.4h.5c.2 0 .4.1.5.4l.6 1.4c.1.2 0 .4-.1.5l-.4.5c-.1.1-.1.3 0 .4.6 1 1.4 1.7 2.4 2.2.2.1.3 0 .4-.1l.5-.6c.1-.2.3-.2.5-.1l1.3.6c.2.1.3.3.3.5 0 .6-.4 1.4-1.2 1.6-.6.2-1.5.1-2.8-.5-1.7-.8-2.9-2.2-3.5-3.5-.4-.9-.4-1.7-.1-2.3z"/>' },
        { key: "telegram",  name: "Telegram",  color: "#229ed9",
          svg: '<path fill="#fff" d="M5.2 11.6l12.1-4.7c.6-.2 1 .1.9.9l-2 9.7c-.1.6-.5.8-1 .5l-3-2.2-1.5 1.4c-.2.2-.3.3-.6.3l.2-3.1 5.6-5c.2-.2 0-.3-.4-.1l-6.9 4.3-3-.9c-.6-.2-.6-.6.2-.9z"/>' },
        { key: "x",         name: "X (Twitter)", color: "#000000",
          svg: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>' },
        { key: "linkedin",  name: "LinkedIn",  color: "#0a66c2",
          svg: '<path fill="#fff" d="M6 9.5h2.6V18H6zM7.3 5.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM10.5 9.5H13v1.2c.4-.7 1.3-1.4 2.6-1.4 2.7 0 3.2 1.8 3.2 4V18h-2.6v-4c0-1 0-2.2-1.4-2.2s-1.6 1-1.6 2.1V18h-2.6z"/>' }
    ];


    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    // only safe web links are shown; a WhatsApp number becomes a wa.me link
    function cleanLink(key, value) {

        value = String(value || "").trim();

        if (!value) return "";

        if (key === "whatsapp" && /^[+\d][\d\s-]{7,16}$/.test(value)) {

            return "https://wa.me/" + value.replace(/\D/g, "");
        }

        return /^https:\/\/[^\s]+$/i.test(value) ? value : "";
    }


    /* ---------- load ---------- */

    async function loadLinks() {

        try {

            var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");

            if (cached && Date.now() - cached.time < CACHE_MINUTES * 60000) return cached.links;

        } catch (e) { }

        var url =
            "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
            "/databases/(default)/documents/settings/site?key=" + API_KEY;

        var links = Object.assign({}, DEFAULT_LINKS);

        try {

            var response = await fetch(url);

            if (response.ok) {

                var doc = await response.json();

                var social = doc.fields && doc.fields.social && doc.fields.social.mapValue &&
                             doc.fields.social.mapValue.fields;

                // once the admin has saved the links, his list is used as it is
                if (social) {

                    links = {};

                    Object.keys(social).forEach(function (key) {
                        links[key] = social[key].stringValue || "";
                    });
                }
            }

        } catch (e) { }

        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), links: links }));
        } catch (e) { }

        return links;
    }


    /* ---------- show ---------- */

    function icon(network) {

        return '<span class="social-icon" style="background:' + network.color + '">' +
            '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' + network.svg + "</svg></span>";
    }

    function render(links) {

        var items = [];

        NETWORKS.forEach(function (network) {

            var link = cleanLink(network.key, links[network.key]);

            if (link) items.push({ network: network, link: link });
        });

        if (!items.length) return;

        // footer row
        var footer = document.querySelector(".site-footer");

        if (footer && !footer.querySelector(".footer-social")) {

            var row = document.createElement("div");

            row.className = "footer-social";

            row.innerHTML =
                '<span class="footer-social-title">Follow us</span>' +
                items.map(function (item) {

                    return '<a href="' + esc(item.link) + '" target="_blank" rel="noopener noreferrer" ' +
                        'title="' + esc(item.network.name) + '" aria-label="' + esc(item.network.name) + '">' +
                        icon(item.network) + "</a>";

                }).join("");

            var before = footer.querySelector(".footer-legal") || footer.querySelector(".footer-bottom");

            if (before && before.parentNode) {
                before.parentNode.insertBefore(row, before);
            } else {
                (footer.querySelector(".container") || footer).appendChild(row);
            }
        }

        // floating WhatsApp button (not on the test page)
        var wa = items.filter(function (item) { return item.network.key === "whatsapp"; })[0];

        if (wa && !document.querySelector(".wa-float") && !/test-attempt/.test(window.location.pathname)) {

            var button = document.createElement("a");

            button.className = "wa-float";

            button.href = wa.link + (wa.link.indexOf("?") === -1 ? "?" : "&") +
                "text=" + encodeURIComponent("Hello DRx Learning Hub, I need help.");

            button.target = "_blank";

            button.rel = "noopener noreferrer";

            button.setAttribute("aria-label", "Chat with us on WhatsApp");

            button.title = "Chat with us on WhatsApp";

            button.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' + wa.network.svg + "</svg>";

            document.body.appendChild(button);
        }
    }


    function start() {

        loadLinks().then(render).catch(function (error) {
            console.warn("Social links:", error.message);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

})();
