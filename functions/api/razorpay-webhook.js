// POST /api/razorpay-webhook
// Razorpay calls this by itself after a payment. It unlocks the
// course even if the student closed the browser right after paying.

import { json, errorResponse, needEnv } from "../_lib/http.js";
import { razorpay, hmacHex, safeEqual } from "../_lib/razorpay.js";
import { enrollStudent } from "../_lib/enroll.js";

export async function onRequestPost(context) {

    const request = context.request;
    const env = context.env;

    try {

        needEnv(env, [
            "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
            "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"
        ]);

        const rawBody = await request.text();

        const signature = request.headers.get("x-razorpay-signature") || "";

        const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, rawBody);

        if (!safeEqual(expected, signature)) {
            return json({ error: "Invalid signature" }, 400);
        }

        const event = JSON.parse(rawBody);

        if (event.event !== "payment.captured" && event.event !== "order.paid") {
            return json({ ok: true, ignored: true });
        }

        const payment = event.payload && event.payload.payment && event.payload.payment.entity;

        if (!payment || !payment.order_id || payment.status !== "captured") {
            return json({ ok: true, ignored: true });
        }

        const order = await razorpay(env, "/orders/" + payment.order_id);

        const notes = order.notes || {};

        if (!notes.uid || !notes.courseId) {
            return json({ ok: true, ignored: true });
        }

        await enrollStudent(env, {
            uid: notes.uid,
            courseId: notes.courseId,
            paymentId: payment.id,
            orderId: payment.order_id,
            amountPaise: payment.amount,
            currency: payment.currency
        });

        return json({ ok: true });

    } catch (error) {

        return errorResponse(error);
    }
}
