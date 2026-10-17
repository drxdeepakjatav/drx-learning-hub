// GET /api/pdf?unit=<unitId>      (header: Authorization: Bearer <login token>)
//
// Sends the PDF of a unit to the student. The Google Drive link is
// never shown to the browser. The server first checks that the student
// is allowed to open the unit, then reads the file from Google Drive.

import { errorResponse, needEnv, HttpError, json } from "../_lib/http.js";
import { verifyUser, getDoc, getGoogleToken } from "../_lib/firebase.js";

function driveFileId(url) {

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

export async function onRequestGet(context) {

    const request = context.request;
    const env = context.env;

    try {

        needEnv(env, [
            "FIREBASE_PROJECT_ID", "FIREBASE_WEB_API_KEY",
            "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"
        ]);

        const user = await verifyUser(env, request);

        const unitId = new URL(request.url).searchParams.get("unit") || "";

        if (!/^[A-Za-z0-9_-]{6,60}$/.test(unitId)) {
            throw new HttpError(400, "Invalid unit.");
        }

        const file = await getDoc(env, "unitFiles/" + unitId);

        if (!file || !file.pdfUrl) {
            throw new HttpError(404, "The PDF for this unit has not been added yet.");
        }

        const course = await getDoc(env, "courses/" + file.courseId);

        if (!course) {
            throw new HttpError(404, "Course not found.");
        }

        // ---- who may open this unit? ----
        let allowed = course.accessType === "free" ||
                      Number(file.unitNumber) <= (Number(course.freeUnits) || 0);

        if (!allowed) {

            const admin = await getDoc(env, "admins/" + user.uid);

            if (admin) {

                allowed = true;

            } else {

                const student = await getDoc(env, "students/" + user.uid);

                allowed = !!student && (student.enrolledCourses || []).indexOf(file.courseId) !== -1;
            }
        }

        if (!allowed) {
            throw new HttpError(403, "This unit is for enrolled students.");
        }

        // ---- get the file ----
        let upstream = null;

        let hint = "";

        const link = String(file.pdfUrl);

        const id = driveFileId(link);

        if (/\/folders\//.test(link)) {

            hint = "The saved link is a Drive FOLDER link. Open the PDF itself in Drive, copy the link of that file and save it in Admin > Units.";

        } else if (id) {

            const result = await fetchFromDrive(env, id);

            upstream = result.response;

            hint = result.hint;

        } else if (/^https:\/\//i.test(link)) {

            const direct = await fetch(link);

            if (direct.ok) upstream = direct;

            else hint = "The saved PDF link did not open (status " + direct.status + ").";

        } else {

            hint = "The saved link is not a valid Google Drive file link.";
        }

        if (!upstream) {

            // only the admin sees the exact reason
            const admin = await getDoc(env, "admins/" + user.uid);

            throw new HttpError(
                502,
                admin && hint
                    ? "PDF could not be opened. " + hint
                    : "The PDF could not be opened. Please tell the admin."
            );
        }

        return new Response(upstream.body, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=\"unit.pdf\"",
                "Cache-Control": "private, no-store"
            }
        });

    } catch (error) {

        return errorResponse(error);
    }
}
