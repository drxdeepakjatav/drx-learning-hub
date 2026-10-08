/* =========================================================
   DRx LEARNING HUB - AUTO LATEST YOUTUBE VIDEOS
   Shows the newest videos of your YouTube channel
   automatically. No manual upload needed.

   Usage on any page:
   <div class="video-grid" id="latestVideos" data-limit="6"></div>
   <script src="youtube-latest.js"></script>
   ========================================================= */

(function () {

    /* ================= SETTINGS ================= */

    var CONFIG = {

        // Your channel handle
        handle: "@drxdeepakjatav",

        // OPTIONAL: if auto-detect fails, paste your channel ID here
        // (starts with UC..., 24 characters).
        // YouTube Studio > Settings > Channel > Advanced settings
        channelId: "",

        // How long to keep the list in the browser (minutes)
        cacheMinutes: 30
    };

    var CHANNEL_URL = "https://www.youtube.com/" + CONFIG.handle;

    var PROXIES = [
        function (u) { return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u); },
        function (u) { return "https://corsproxy.io/?" + encodeURIComponent(u); }
    ];


    /* ================= HELPERS ================= */

    function esc(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function storageGet(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    }

    function storageSet(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { }
    }

    async function fetchViaProxy(url) {
        var lastError;
        for (var i = 0; i < PROXIES.length; i++) {
            try {
                var res = await fetch(PROXIES[i](url));
                if (res.ok) return await res.text();
                lastError = new Error("HTTP " + res.status);
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError || new Error("Proxy fetch failed");
    }

    function formatDate(value) {
        var d = new Date(value);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric"
        });
    }


    /* ================= CHANNEL ID ================= */

    async function getChannelId() {

        if (CONFIG.channelId) return CONFIG.channelId;

        var cached = storageGet("drx_yt_channel_id");
        if (cached && cached.handle === CONFIG.handle && cached.id) {
            return cached.id;
        }

        var html = await fetchViaProxy(CHANNEL_URL);

        var match =
            html.match(/"channelId":"(UC[\w-]{22})"/) ||
            html.match(/"externalId":"(UC[\w-]{22})"/) ||
            html.match(/channel\/(UC[\w-]{22})/);

        if (!match) throw new Error("Channel ID not found");

        storageSet("drx_yt_channel_id", { handle: CONFIG.handle, id: match[1] });

        return match[1];
    }


    /* ================= LOAD VIDEOS ================= */

    function videoIdFromLink(link) {
        var m = String(link || "").match(/[?&]v=([\w-]{11})/) ||
                String(link || "").match(/shorts\/([\w-]{11})/);
        return m ? m[1] : "";
    }

    async function loadFromRss2Json(feedUrl) {
        var res = await fetch(
            "https://api.rss2json.com/v1/api.json?rss_url=" +
            encodeURIComponent(feedUrl)
        );
        var json = await res.json();
        if (json.status !== "ok" || !json.items) throw new Error("rss2json failed");

        return json.items.map(function (item) {
            return {
                id: videoIdFromLink(item.link),
                title: item.title,
                date: item.pubDate
            };
        }).filter(function (v) { return v.id; });
    }

    async function loadFromXml(feedUrl) {
        var xml = await fetchViaProxy(feedUrl);
        var doc = new DOMParser().parseFromString(xml, "text/xml");
        var entries = Array.prototype.slice.call(doc.getElementsByTagName("entry"));

        return entries.map(function (entry) {
            var idEl = entry.getElementsByTagName("yt:videoId")[0];
            var titleEl = entry.getElementsByTagName("title")[0];
            var dateEl = entry.getElementsByTagName("published")[0];
            return {
                id: idEl ? idEl.textContent : "",
                title: titleEl ? titleEl.textContent : "",
                date: dateEl ? dateEl.textContent : ""
            };
        }).filter(function (v) { return v.id; });
    }

    async function getVideos() {

        var channelId = await getChannelId();

        var cacheKey = "drx_yt_videos_" + channelId;
        var cached = storageGet(cacheKey);

        if (cached && cached.items && cached.items.length &&
            Date.now() - cached.time < CONFIG.cacheMinutes * 60000) {
            return cached.items;
        }

        var feedUrl =
            "https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId;

        var items;

        try {
            items = await loadFromRss2Json(feedUrl);
        } catch (e) {
            items = await loadFromXml(feedUrl);
        }

        if (!items.length) throw new Error("No videos found");

        storageSet(cacheKey, { time: Date.now(), items: items });

        return items;
    }


    /* ================= RENDER ================= */

    function renderVideos(container, videos) {

        var limit = parseInt(container.getAttribute("data-limit"), 10) || 6;

        container.innerHTML = "";

        videos.slice(0, limit).forEach(function (video) {

            var card = document.createElement("div");
            card.className = "video-card";

            var thumb = "https://i.ytimg.com/vi/" + video.id + "/hqdefault.jpg";
            var watchUrl = "https://www.youtube.com/watch?v=" + video.id;

            card.innerHTML =
                '<div class="video-thumbnail yt-thumb" data-id="' + esc(video.id) + '">' +
                    '<img src="' + esc(thumb) + '" alt="' + esc(video.title) + '" loading="lazy">' +
                    '<div class="play-button">▶</div>' +
                '</div>' +
                '<div class="video-info">' +
                    '<h3>' + esc(video.title) + '</h3>' +
                    '<p class="yt-date">' + esc(formatDate(video.date)) + '</p>' +
                    '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener" ' +
                       'class="btn btn-primary btn-small">Watch on YouTube</a>' +
                '</div>';

            container.appendChild(card);
        });

        // Click on thumbnail = play video right here
        container.querySelectorAll(".yt-thumb").forEach(function (box) {
            box.addEventListener("click", function () {
                var id = box.getAttribute("data-id");
                box.innerHTML =
                    '<iframe src="https://www.youtube-nocookie.com/embed/' + id +
                    '?autoplay=1&rel=0" title="YouTube video" frameborder="0" ' +
                    'allow="accelerometer; autoplay; encrypted-media; picture-in-picture" ' +
                    'allowfullscreen></iframe>';
            }, { once: true });
        });
    }

    function renderError(container) {
        container.innerHTML =
            '<div class="empty-state" style="grid-column:1/-1;">' +
                '<h3>Videos could not be loaded right now</h3>' +
                '<p>Please watch our latest videos on YouTube.</p>' +
                '<a href="' + CHANNEL_URL + '" target="_blank" rel="noopener" ' +
                   'class="btn btn-primary">Open YouTube Channel</a>' +
            '</div>';
    }

    function renderLoading(container) {
        container.innerHTML =
            '<div class="empty-state" style="grid-column:1/-1;">' +
                '<div class="loading-spinner"></div>' +
                '<p>Loading latest videos...</p>' +
            '</div>';
    }


    /* ================= START ================= */

    document.addEventListener("DOMContentLoaded", async function () {

        var container = document.getElementById("latestVideos");
        if (!container) return;

        renderLoading(container);

        try {
            var videos = await getVideos();
            renderVideos(container, videos);
        } catch (error) {
            console.error("YouTube latest videos error:", error);
            renderError(container);
        }
    });

})();