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

    // 1) private file shared with the service account (best, nothing is public)
    try {

        const token = await getGoogleToken(env, "https://www.googleapis.com/auth/drive.readonly");

        const response = await fetch(
            "https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media&supportsAllDrives=true",
            { headers: { Authorization: "Bearer " + token } }
        );

        if (response.ok) return response;

    } catch (error) {

        console.error("Drive API:", error.message);
    }

    // 2) file shared as "Anyone with the link"
    const publicResponse = await fetch(
        "https://drive.usercontent.google.com/download?id=" + fileId + "&export=download&confirm=t"
    );

    const type = publicResponse.headers.get("content-type") || "";

    if (publicResponse.ok && type.indexOf("text/html") === -1) return publicResponse;

    return null;
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
        let upstream;

        const id = driveFileId(file.pdfUrl);

        if (id) {

            upstream = await fetchFromDrive(env, id);

        } else if (/^https:\/\//i.test(file.pdfUrl)) {

            upstream = await fetch(file.pdfUrl);

            if (!upstream.ok) upstream = null;
        }

        if (!upstream) {
            throw new HttpError(502, "The PDF could not be opened. Please tell the admin.");
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
