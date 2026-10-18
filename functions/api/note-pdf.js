// GET /api/note-pdf?note=<noteId>
//
// Sends the PDF of a note. Notes are public, so no login is needed.
// The Google Drive page never opens; the PDF is shown inside the website.

import { errorResponse, needEnv, HttpError } from "../_lib/http.js";
import { verifyUser, getDoc } from "../_lib/firebase.js";
import { openPdf, pdfResponse } from "../_lib/drive.js";

export async function onRequestGet(context) {

    const request = context.request;
    const env = context.env;

    try {

        needEnv(env, [
            "FIREBASE_PROJECT_ID", "FIREBASE_WEB_API_KEY",
            "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"
        ]);

        const noteId = new URL(request.url).searchParams.get("note") || "";

        if (!/^[A-Za-z0-9_-]{6,60}$/.test(noteId)) {
            throw new HttpError(400, "Invalid note.");
        }

        const note = await getDoc(env, "notes/" + noteId);

        if (!note || note.status !== "active" || !note.pdfUrl) {
            throw new HttpError(404, "This note is not available.");
        }

        const result = await openPdf(env, note.pdfUrl);

        if (!result.response) {

            // the exact reason is shown only if the admin is logged in
            let isAdmin = false;

            try {

                const user = await verifyUser(env, request);

                isAdmin = !!(await getDoc(env, "admins/" + user.uid));

            } catch (error) { }

            throw new HttpError(
                502,
                isAdmin && result.hint
                    ? "PDF could not be opened. " + result.hint
                    : "This PDF could not be opened right now. Please try again later."
            );
        }

        return pdfResponse(result.response);

    } catch (error) {

        return errorResponse(error);
    }
}
