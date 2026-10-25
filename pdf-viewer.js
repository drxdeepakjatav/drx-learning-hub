/* =========================================================
   DRx LEARNING HUB - PDF VIEWER (inside the website)
   - The PDF comes from /api/pdf (our own server), never from a
     Google Drive link, so no Drive address is shown to the student.
   - It is drawn page by page on the screen (works on phones too).
   - Download button saves the same PDF.
   ========================================================= */

window.DRX_PDF = (function () {

    var PDFJS_VERSION = "3.11.174";

    var PDFJS_URL =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION + "/pdf.min.js";

    var WORKER_URL =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/" + PDFJS_VERSION + "/pdf.worker.min.js";


    function loadPdfJs() {

        return new Promise(function (resolve, reject) {

            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
                resolve();
                return;
            }

            var script = document.createElement("script");

            script.src = PDFJS_URL;

            script.onload = function () {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
                resolve();
            };

            script.onerror = function () {
                reject(new Error("The PDF viewer could not be loaded. Please check your internet connection."));
            };

            document.head.appendChild(script);
        });
    }

    async function fetchPdf(url, loginNeeded) {

        var user = (typeof auth !== "undefined") ? auth.currentUser : null;

        var headers = {};

        if (user) {

            headers.Authorization = "Bearer " + (await user.getIdToken());

        } else if (loginNeeded) {

            var loginError = new Error("Please log in to open this PDF.");
            loginError.status = 401;
            throw loginError;
        }

        var response = await fetch(url, { headers: headers, cache: "no-store" });

        var type = response.headers.get("content-type") || "";

        if (!response.ok || type.indexOf("pdf") === -1) {

            var data = {};

            try { data = await response.json(); } catch (e) { }

            var error = new Error(
                data.error ||
                (response.status === 404
                    ? "The PDF service is not set up on this website yet."
                    : "The PDF could not be opened.")
            );

            error.status = response.status;

            throw error;
        }

        return response.arrayBuffer();
    }


    /* ---------- draw the pages (only the ones near the screen) ---------- */

    function drawPages(pdf, holder) {

        var width = Math.min(holder.clientWidth || 800, 1000);

        var ratio = window.devicePixelRatio || 1;

        var observer = new IntersectionObserver(function (entries) {

            entries.forEach(function (entry) {

                if (!entry.isIntersecting) return;

                var box = entry.target;

                observer.unobserve(box);

                renderPage(box);
            });

        }, { rootMargin: "800px 0px" });

        async function renderPage(box) {

            var page = await pdf.getPage(Number(box.dataset.page));

            var base = page.getViewport({ scale: 1 });

            var viewport = page.getViewport({ scale: (width / base.width) * ratio });

            var canvas = document.createElement("canvas");

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = "100%";
            canvas.style.height = "auto";

            await page.render({
                canvasContext: canvas.getContext("2d"),
                viewport: viewport
            }).promise;

            box.innerHTML = "";

            box.appendChild(canvas);
        }

        // reserve the space of every page first
        async function prepare() {

            for (var n = 1; n <= pdf.numPages; n++) {

                var page = await pdf.getPage(n);

                var base = page.getViewport({ scale: 1 });

                var box = document.createElement("div");

                box.className = "pdf-page";

                box.dataset.page = String(n);

                box.style.aspectRatio = base.width + " / " + base.height;

                box.innerHTML = '<span class="pdf-page-number">Page ' + n + "</span>";

                holder.appendChild(box);

                observer.observe(box);
            }
        }

        return prepare();
    }


    /* ---------- public function ---------- */

    // options: container, downloadButton, fileName and either
    //   unitId  (course unit, login needed)   or   url  (public file, e.g. a note)
    async function show(options) {

        var container = options.container;

        container.innerHTML = '<div class="pdf-status">Loading PDF...</div>';

        var url = options.url || ("/api/pdf?unit=" + encodeURIComponent(options.unitId));

        var results = await Promise.all([loadPdfJs(), fetchPdf(url, false)]);

        var buffer = results[1];

        // download button: save the same file
        var blob = new Blob([buffer], { type: "application/pdf" });

        var blobUrl = URL.createObjectURL(blob);

        if (options.downloadButton) {

            options.downloadButton.href = blobUrl;

            options.downloadButton.setAttribute("download", options.fileName || "file.pdf");

            options.downloadButton.classList.remove("disabled");
        }

        var pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;

        container.innerHTML = "";

        await drawPages(pdf, container);

        return blobUrl;
    }

    // opens a pop-up reader on top of the page (used on the Notes page)
    function openModal(options) {

        var overlay = document.createElement("div");

        overlay.className = "pdf-modal";

        overlay.innerHTML =
            '<div class="pdf-modal-box">' +
                '<div class="pdf-modal-bar">' +
                    '<strong class="pdf-modal-title"></strong>' +
                    '<span class="pdf-modal-actions">' +
                        '<a class="btn btn-primary btn-small disabled" href="#">⬇ Download</a>' +
                        '<button class="btn btn-secondary btn-small" type="button">✕ Close</button>' +
                    "</span>" +
                "</div>" +
                '<div class="pdf-reader pdf-modal-reader"></div>' +
            "</div>";

        overlay.querySelector(".pdf-modal-title").textContent = options.title || "PDF";

        var reader = overlay.querySelector(".pdf-modal-reader");

        var download = overlay.querySelector("a.btn");

        var blobUrl = "";

        document.body.appendChild(overlay);

        document.body.style.overflow = "hidden";

        function close() {

            document.removeEventListener("keydown", onKey);

            document.body.style.overflow = "";

            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);

            if (blobUrl) URL.revokeObjectURL(blobUrl);
        }

        function onKey(event) {
            if (event.key === "Escape") close();
        }

        document.addEventListener("keydown", onKey);

        overlay.querySelector("button").addEventListener("click", close);

        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) close();
        });

        show({
            url: options.url,
            container: reader,
            downloadButton: download,
            fileName: options.fileName
        }).then(function (url) {

            blobUrl = url;

        }).catch(function (error) {

            console.error("PDF error:", error);

            reader.innerHTML =
                '<div class="empty-state"><h3>PDF not available</h3><p>' +
                String(error.message || "The PDF could not be opened.")
                    .replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</p></div>";
        });
    }

    return { show: show, openModal: openModal };

})();
