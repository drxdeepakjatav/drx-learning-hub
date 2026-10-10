// POST /api/cashfree-verify   body: { orderId }
// Asks Cashfree if the order is PAID, then unlocks the course.

import { json, errorResponse, needEnv, HttpError } from "../_lib/http.js";
import { verifyUser, getDoc } from "../_lib/firebase.js";
import { cashfree } from "../_lib/cashfree.js";
import { enrollStudent } from "../_lib/enroll.js";

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

        const orderId = String(body.orderId || "");

        if (!/^[A-Za-z0-9_-]{6,60}$/.test(orderId)) {
            throw new HttpError(400, "Invalid order.");
        }

        const pending = await getDoc(env, "pendingOrders/" + orderId);

        if (!pending) {
            throw new HttpError(404, "Order not found.");
        }

        if (pending.uid !== user.uid) {
            throw new HttpError(403, "This payment belongs to a different account.");
        }

        // ask Cashfree directly - do not trust the browser
        const order = await cashfree(env, "/orders/" + encodeURIComponent(orderId));

        if (order.order_status !== "PAID") {
            return json({ ok: false, paid: false, status: order.order_status || "UNKNOWN" });
        }

        const result = await enrollStudent(env, {
            uid: pending.uid,
            courseId: pending.courseId,
            paymentId: "cf_" + orderId,
            orderId: orderId,
            amountPaise: Math.round(Number(order.order_amount) * 100),
            currency: order.order_currency || "INR"
        });

        return json({ ok: true, paid: true, already: result.already });

    } catch (error) {

        return errorResponse(error);
    }
}
