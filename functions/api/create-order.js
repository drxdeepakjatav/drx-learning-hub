// POST /api/create-order   body: { courseId }
// Creates a Razorpay order. The PRICE COMES FROM THE DATABASE,
// never from the browser.

import { json, errorResponse, needEnv, HttpError } from "../_lib/http.js";
import { verifyUser, getDoc } from "../_lib/firebase.js";
import { razorpay } from "../_lib/razorpay.js";

export async function onRequestPost(context) {

    const request = context.request;
    const env = context.env;

    try {

        needEnv(env, [
            "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET",
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

        const order = await razorpay(env, "/orders", "POST", {
            amount: Math.round(price * 100),
            currency: "INR",
            receipt: ("rc" + Date.now()).slice(0, 40),
            notes: { uid: user.uid, courseId: courseId }
        });

        return json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: env.RAZORPAY_KEY_ID,
            courseTitle: course.title || courseId
        });

    } catch (error) {

        return errorResponse(error);
    }
}
