// POST /api/verify-payment   body: { orderId, paymentId, signature }
// Checks the Razorpay signature, then unlocks the course.

import { json, errorResponse, needEnv, HttpError } from "../_lib/http.js";
import { verifyUser } from "../_lib/firebase.js";
import { razorpay, hmacHex, safeEqual } from "../_lib/razorpay.js";
import { enrollStudent } from "../_lib/enroll.js";

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

        const orderId = String(body.orderId || "");
        const paymentId = String(body.paymentId || "");
        const signature = String(body.signature || "");

        if (!/^order_[A-Za-z0-9]+$/.test(orderId) || !/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
            throw new HttpError(400, "Invalid payment details.");
        }

        const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, orderId + "|" + paymentId);

        if (!safeEqual(expected, signature)) {
            throw new HttpError(400, "Payment could not be verified.");
        }

        // ask Razorpay directly - do not trust the browser
        const payment = await razorpay(env, "/payments/" + paymentId);

        if (payment.order_id !== orderId) {
            throw new HttpError(400, "Payment does not match the order.");
        }

        if (payment.status !== "captured") {
            return json({ ok: false, pending: true, message: "Your payment is being confirmed. The course will open automatically in a moment." }, 202);
        }

        const order = await razorpay(env, "/orders/" + orderId);

        const notes = order.notes || {};

        if (notes.uid !== user.uid) {
            throw new HttpError(403, "This payment belongs to a different account.");
        }

        const result = await enrollStudent(env, {
            uid: user.uid,
            courseId: notes.courseId,
            paymentId: paymentId,
            orderId: orderId,
            amountPaise: payment.amount,
            currency: payment.currency
        });

        return json({ ok: true, already: result.already });

    } catch (error) {

        return errorResponse(error);
    }
}
