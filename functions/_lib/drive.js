// Opens a PDF from Google Drive for the server.
// Used by /api/pdf (course units) and /api/note-pdf (notes).

import { getGoogleToken } from "./firebase.js";

export function driveFileId(url) {

    url = String(url || "");

    const match =
        url.match(/\/file\/d\/([\w-]{10,})/) ||
        url.match(/[?&]id=([\w-]{10,})/) ||
        url.match(/\/d\/([\w-]{10,})/);

    return match ? match[1] : "";
}

async function fetchFromDrive(env, fileId) {

    const email = env.FIREBASE_CLIENT_EMAIL || "the service account";

    let hint = "";

    // 1) private file shared with the service account (best, nothing is public)
    try {

        const token = await getGoogleToken(env, "https://www.googleapis.com/auth/drive.readonly");

        const response = await fetch(
            "https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media&supportsAllDrives=true",
            { headers: { Authorization: "Bearer " + token } }
        );

        if (response.ok) return { response: response, hint: "" };

        const body = await response.text();

        console.error("Drive API status", response.status, body.slice(0, 300));

        if (/SERVICE_DISABLED|accessNotConfigured|has not been used/i.test(body)) {

            hint = "Google Drive API is not turned on. Turn it on in Google Cloud Console (APIs and Services > Library > Google Drive API) for project " +
                   (env.FIREBASE_PROJECT_ID || "") + ".";

        } else if (response.status === 404 || response.status === 403) {

            hint = "Google Drive cannot open this file for the server. Share the PDF (or its folder) with " + email +
                   " as Viewer, or set the file to 'Anyone with the link'.";

        } else if (response.status === 400 && /not.*binary|export/i.test(body)) {

            hint = "This link is a Google Docs file, not a PDF. Upload the PDF file to Drive and use its link.";

        } else {

            hint = "Google Drive answered with status " + response.status + ".";
        }

    } catch (error) {

        console.error("Drive API:", error.message);

        hint = "The server could not talk to Google Drive (" + error.message + ").";
    }

    // 2) file shared as "Anyone with the link"
    try {

        const publicResponse = await fetch(
            "https://drive.usercontent.google.com/download?id=" + fileId + "&export=download&confirm=t"
        );

        const type = publicResponse.headers.get("content-type") || "";

        if (publicResponse.ok && type.indexOf("text/html") === -1) {
            return { response: publicResponse, hint: "" };
        }

    } catch (error) {

        console.error("Public download:", error.message);
    }

    return { response: null, hint: hint };
}

// link = whatever the admin saved. Returns { response, hint }
export async function openPdf(env, link) {

    link = String(link || "");

    const id = driveFileId(link);

    if (/\/folders\//.test(link)) {

        return {
            response: null,
            hint: "The saved link is a Drive FOLDER link. Open the PDF itself in Drive, copy the link of that file and save it again."
        };
    }

    if (id) return fetchFromDrive(env, id);

    if (/^https:\/\//i.test(link)) {

        const direct = await fetch(link);

        if (direct.ok) return { response: direct, hint: "" };

        return { response: null, hint: "The saved PDF link did not open (status " + direct.status + ")." };
    }

    return { response: null, hint: "The saved link is not a valid Google Drive file link." };
}

export function pdfResponse(upstream) {

    return new Response(upstream.body, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": "inline; filename=\"file.pdf\"",
            "Cache-Control": "private, no-store"
        }
    });
}
