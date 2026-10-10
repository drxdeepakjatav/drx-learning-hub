// POST /api/cashfree-create-order   body: { courseId }
// Creates a Cashfree order. The PRICE COMES FROM THE DATABASE.
// The order is also saved in "pendingOrders" so that verify and
// webhook know which student and course it belongs to.

import { json, errorResponse, needEnv, HttpError } from "../_lib/http.js";
import { verifyUser, getDoc, commit, docName } from "../_lib/firebase.js";
import { cashfree } from "../_lib/cashfree.js";

function randomPart() {

    const bytes = new Uint8Array(6);

    crypto.getRandomValues(bytes);

    return Array.from(bytes).map(function (b) {
        return "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36];
    }).join("");
}

export async function onRequestPost(context) {

    const request = context.request;
    const env = context.env;

    try {

        needEnv(env, [
            "CASHFREE_APP_ID", "CASHFREE_SECRET",
            "FIREBASE_PROJECT_ID", "FIREBASE_WEB_API_KEY",
            "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"
        ]);

        const user = await verifyUser(env, request);

        const body = await request.json().catch(function () { return {}; });

        const courseId = String(body.courseId || "");

        if (!/^[A-Za-z0-9_-]{1,80}$/.test(courseId)) {
            throw new HttpError(400, "Invalid course.");
        }

        const course = await getDoc(env, "courses/" + courseId);

        if (!course || course.status !== "active") {
            throw new HttpError(404, "This course is not available.");
        }

        if (course.accessType === "free") {
            throw new HttpError(400, "This course is free. No payment is needed.");
        }

        const price = Number(course.price) || 0;

        if (price <= 0) {
            throw new HttpError(400, "The price of this course is not set yet.");
        }

        const student = await getDoc(env, "students/" + user.uid);

        if (!student) {
            throw new HttpError(404, "Student profile not found.");
        }

        if ((student.enrolledCourses || []).indexOf(courseId) !== -1) {
            throw new HttpError(400, "You are already enrolled in this course.");
        }

        const orderId = "drx" + Date.now() + randomPart();

        const origin = new URL(request.url).origin;

        const order = await cashfree(env, "/orders", "POST", {
            order_id: orderId,
            order_amount: Number(price.toFixed(2)),
            order_currency: "INR",
            customer_details: {
                customer_id: user.uid,
                customer_email: user.email || "student@example.com",
                // Cashfree needs a phone number. Students are not asked for one.
                customer_phone: "9999999999"
            },
            order_meta: {
                return_url: origin + "/learn.html?course=" + encodeURIComponent(courseId) + "&cforder={order_id}",
                notify_url: origin + "/api/cashfree-webhook"
            },
            order_note: ("Course " + courseId).slice(0, 80)
        });

        // remember who this order belongs to (clients can never read this)
        await commit(env, [{
            update: {
                name: docName(env, "pendingOrders/" + orderId),
                fields: {
                    uid: { stringValue: user.uid },
                    courseId: { stringValue: courseId },
                    amountPaise: { integerValue: String(Math.round(price * 100)) }
                }
            },
            updateTransforms: [
                { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }
            ],
            currentDocument: { exists: false }
        }]);

        return json({
            gateway: "cashfree",
            orderId: orderId,
            paymentSessionId: order.payment_session_id,
            mode: env.CASHFREE_ENV === "sandbox" ? "sandbox" : "production",
            courseTitle: course.title || courseId
        });

    } catch (error) {

        return errorResponse(error);
    }
}
