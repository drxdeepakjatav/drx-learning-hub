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

    async function fetchPdf(unitId) {

        var user = auth.currentUser;

        if (!user) {
            var loginError = new Error("Please log in to open this PDF.");
            loginError.status = 401;
            throw loginError;
        }

        var token = await user.getIdToken();

        var response = await fetch("/api/pdf?unit=" + encodeURIComponent(unitId), {
            headers: { Authorization: "Bearer " + token },
            cache: "no-store"
        });

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

    // options: unitId, container, downloadButton, fileName
    async function show(options) {

        var container = options.container;

        container.innerHTML = '<div class="pdf-status">Loading PDF...</div>';

        var results = await Promise.all([loadPdfJs(), fetchPdf(options.unitId)]);

        var buffer = results[1];

        // download button: save the same file
        var blob = new Blob([buffer], { type: "application/pdf" });

        var blobUrl = URL.createObjectURL(blob);

        if (options.downloadButton) {

            options.downloadButton.href = blobUrl;

            options.downloadButton.setAttribute("download", options.fileName || "unit.pdf");

            options.downloadButton.classList.remove("disabled");
        }

        var pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;

        container.innerHTML = "";

        await drawPages(pdf, container);
    }

    return { show: show };

})();
