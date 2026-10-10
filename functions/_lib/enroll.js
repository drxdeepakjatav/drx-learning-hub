// Marks a student as enrolled after a verified payment.
// Everything is written in ONE atomic commit and is safe to run twice.

import { HttpError } from "./http.js";
import { getDoc, commit, docName } from "./firebase.js";

function str(value) {
    return { stringValue: String(value === undefined || value === null ? "" : value) };
}

function int(value) {
    return { integerValue: String(Math.round(Number(value) || 0)) };
}

function randomId() {

    const bytes = new Uint8Array(15);

    crypto.getRandomValues(bytes);

    return Array.from(bytes).map(function (b) {
        return "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36];
    }).join("");
}

export async function enrollStudent(env, info) {

    const uid = info.uid;
    const courseId = info.courseId;
    const paymentId = info.paymentId;

    // already handled (customer clicked twice, or webhook came after verify)
    if (await getDoc(env, "payments/" + paymentId)) {
        return { already: true };
    }

    const student = await getDoc(env, "students/" + uid);

    if (!student) {
        throw new HttpError(404, "Student profile not found.");
    }

    const course = await getDoc(env, "courses/" + courseId);

    if (!course) {
        throw new HttpError(404, "Course not found.");
    }

    // the amount paid must cover the course price set by the admin
    const expectedPaise = Math.round((Number(course.price) || 0) * 100);

    if (!expectedPaise || Number(info.amountPaise) < expectedPaise) {
        throw new HttpError(400, "The amount paid does not match the course price.");
    }

    const root = function (path) { return docName(env, path); };

    const writes = [

        // payment record (fails if it already exists)
        {
            update: {
                name: root("payments/" + paymentId),
                fields: {
                    studentId: str(uid),
                    studentName: str(student.name),
                    studentEmail: str(student.email),
                    courseId: str(courseId),
                    courseTitle: str(course.title),
                    orderId: str(info.orderId),
                    amount: int(info.amountPaise),
                    currency: str(info.currency || "INR"),
                    status: str("paid")
                }
            },
            updateTransforms: [
                { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }
            ],
            currentDocument: { exists: false }
        },

        // enrollment record (same shape as the admin Enrollments page)
        {
            update: {
                name: root("enrollments/" + randomId()),
                fields: {
                    studentId: str(uid),
                    studentName: str(student.name),
                    studentEmail: str(student.email),
                    courseId: str(courseId),
                    courseTitle: str(course.title),
                    enrolledBy: str("payment:" + paymentId)
                }
            },
            updateTransforms: [
                { fieldPath: "enrolledAt", setToServerValue: "REQUEST_TIME" }
            ]
        },

        // add the course to the student's list
        {
            update: { name: root("students/" + uid), fields: {} },
            updateMask: { fieldPaths: [] },
            updateTransforms: [
                {
                    fieldPath: "enrolledCourses",
                    appendMissingElements: { values: [str(courseId)] }
                }
            ],
            currentDocument: { exists: true }
        }
    ];

    try {

        await commit(env, writes);

    } catch (error) {

        // another request may have finished first
        if (await getDoc(env, "payments/" + paymentId)) {
            return { already: true };
        }

        throw error;
    }

    return { already: false };
}
