// GET /api/pdf?unit=<unitId>      (header: Authorization: Bearer <login token>)
//
// Sends the PDF of a course unit to the student. The Google Drive link is
// never shown to the browser. The server first checks that the student
// is allowed to open the unit, then reads the file from Google Drive.

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

        // login is optional: free material can be opened by anyone
        let user = null;

        try {

            user = await verifyUser(env, request);

        } catch (error) {

            user = null;
        }

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
        const settings = await getDoc(env, "settings/site");

        let allowed = (settings && settings.allFree === true) ||
                      course.accessType === "free" ||
                      Number(file.unitNumber) <= (Number(course.freeUnits) || 0);

        if (!allowed) {

            if (!user) {
                throw new HttpError(401, "Please log in to open this unit.");
            }

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
        const result = await openPdf(env, file.pdfUrl);

        if (!result.response) {

            // only the admin sees the exact reason
            const admin = user ? await getDoc(env, "admins/" + user.uid) : null;

            throw new HttpError(
                502,
                admin && result.hint
                    ? "PDF could not be opened. " + result.hint
                    : "The PDF could not be opened. Please tell the admin."
            );
        }

        return pdfResponse(result.response);

    } catch (error) {

        return errorResponse(error);
    }
}
