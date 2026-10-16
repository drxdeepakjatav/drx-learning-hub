/* =========================================================
   DRx LEARNING HUB - NOTICE LINE (scrolling announcements)
   Shows the active notifications from the admin panel in a
   moving line just below the header of every student page.

   It reads the "notifications" collection straight from
   Firestore (public read), so it works on every page, even
   on pages that do not load Firebase.
   ========================================================= */

(function () {

    // same values as firebase-config.js (they are public)
    var PROJECT_ID = "drx-learning-hub-2";
    var API_KEY = "AIzaSyCWZpckA8cwboV6RVHAN57p7b8vXUByKNc";

    var CACHE_KEY = "drx_notices_v1";
    var CACHE_MINUTES = 2;
    var HIDE_KEY = "drx_notice_hidden";
    var SPEED = 70; // pixels per second

    if (/\/admin(\/|$)/.test(window.location.pathname)) return;


    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function field(doc, name, type) {

        var f = doc.fields && doc.fields[name];

        return f && f[type] !== undefined ? f[type] : undefined;
    }

    function safeLink(url) {

        url = String(url || "").trim();

        if (!url) return "";

        if (/^https?:\/\//i.test(url)) return url;

        if (/^[\w\-./]+(\?[\w\-=&%.]*)?(#[\w\-]*)?$/.test(url)) return url;

        return "";
    }


    /* ---------- load ---------- */

    async function loadNotices() {

        try {

            var cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");

            if (cached && Date.now() - cached.time < CACHE_MINUTES * 60000) {
                return cached.items;
            }

        } catch (e) { }

        var url =
            "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID +
            "/databases/(default)/documents/notifications?pageSize=50&key=" + API_KEY;

        var response = await fetch(url);

        if (!response.ok) throw new Error("Notice request failed (" + response.status + ")");

        var data = await response.json();

        var now = Date.now();

        var items = (data.documents || []).map(function (doc) {

            return {
                text: field(doc, "text", "stringValue") || "",
                link: field(doc, "link", "stringValue") || "",
                active: field(doc, "active", "booleanValue") !== false,
                created: Date.parse(field(doc, "createdAt", "timestampValue") || "") || 0,
                expires: Date.parse(field(doc, "expiresAt", "timestampValue") || "") || 0
            };

        }).filter(function (n) {

            return n.text && n.active && (!n.expires || n.expires > now);

        }).sort(function (a, b) {

            return b.created - a.created;
        });

        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), items: items }));
        } catch (e) { }

        return items;
    }


    /* ---------- show ---------- */

    function render(items) {

        var header = document.querySelector(".site-header");

        if (!header || !items.length) return;

        var signature = items.map(function (n) { return n.text; }).join("|");

        try {
            if (sessionStorage.getItem(HIDE_KEY) === signature) return;
        } catch (e) { }

        var parts = items.map(function (n) {

            var link = safeLink(n.link);

            if (!link) return "<span>" + esc(n.text) + "</span>";

            var external = /^https?:\/\//i.test(link) && link.indexOf(window.location.origin) !== 0;

            return '<a href="' + esc(link) + '"' + (external ? ' target="_blank" rel="noopener"' : "") + ">" + esc(n.text) + "</a>";
        });

        var bar = document.createElement("div");

        bar.className = "notice-bar";

        bar.setAttribute("role", "region");

        bar.setAttribute("aria-label", "Notices");

        bar.innerHTML =
            '<span class="notice-label">📢 Notice</span>' +
            '<div class="notice-window"><div class="notice-track">' +
                parts.join('<span class="notice-sep">•</span>') +
            "</div></div>" +
            '<button class="notice-close" type="button" aria-label="Close notice">×</button>';

        header.insertAdjacentElement("afterend", bar);

        // speed depends on how long the text is
        var windowEl = bar.querySelector(".notice-window");
        var track = bar.querySelector(".notice-track");

        var start = windowEl.clientWidth;
        var distance = start + track.scrollWidth;

        track.style.setProperty("--notice-start", start + "px");
        track.style.setProperty("--notice-duration", Math.max(8, distance / SPEED) + "s");

        bar.querySelector(".notice-close").addEventListener("click", function () {

            bar.parentNode.removeChild(bar);

            try { sessionStorage.setItem(HIDE_KEY, signature); } catch (e) { }
        });
    }


    function start() {

        loadNotices().then(render).catch(function (error) {
            console.warn("Notice line:", error.message);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }

})();
