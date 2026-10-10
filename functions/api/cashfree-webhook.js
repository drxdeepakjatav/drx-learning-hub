// POST /api/cashfree-webhook
// Cashfree calls this by itself after a payment, so the course opens
// even if the student closed the browser right after paying.

import { json, errorResponse, needEnv } from "../_lib/http.js";
import { getDoc } from "../_lib/firebase.js";
import { cashfree, webhookSignature, safeEqual } from "../_lib/cashfree.js";
import { enrollStudent } from "../_lib/enroll.js";

export async function onRequestPost(context) {

    const request = context.request;
    const env = context.env;

    try {

        needEnv(env, [
            "CASHFREE_APP_ID", "CASHFREE_SECRET",
            "FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"
        ]);

        const rawBody = await request.text();

        const timestamp = request.headers.get("x-webhook-timestamp") || "";

        const signature = request.headers.get("x-webhook-signature") || "";

        const expected = await webhookSignature(env.CASHFREE_SECRET, timestamp, rawBody);

        if (!safeEqual(expected, signature)) {
            return json({ error: "Invalid signature" }, 400);
        }

        const event = JSON.parse(rawBody);

        if (event.type !== "PAYMENT_SUCCESS_WEBHOOK") {
            return json({ ok: true, ignored: true });
        }

        const orderId = event.data && event.data.order && event.data.order.order_id;

        if (!orderId) {
            return json({ ok: true, ignored: true });
        }

        const pending = await getDoc(env, "pendingOrders/" + orderId);

        if (!pending) {
            return json({ ok: true, ignored: true });
        }

        // confirm with Cashfree instead of trusting the message body
        const order = await cashfree(env, "/orders/" + encodeURIComponent(orderId));

        if (order.order_status !== "PAID") {
            return json({ ok: true, ignored: true });
        }

        await enrollStudent(env, {
            uid: pending.uid,
            courseId: pending.courseId,
            paymentId: "cf_" + orderId,
            orderId: orderId,
            amountPaise: Math.round(Number(order.order_amount) * 100),
            currency: order.order_currency || "INR"
        });

        return json({ ok: true });

    } catch (error) {

        return errorResponse(error);
    }
}
