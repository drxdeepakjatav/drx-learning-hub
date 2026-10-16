// GET /api/payment-check
// Shows if the payment setup is complete. It NEVER shows any secret value,
// only yes / no for each setting.

import { json } from "../_lib/http.js";
import { getDoc } from "../_lib/firebase.js";
import { cashfreeBase } from "../_lib/cashfree.js";

const NAMES = [
    "CASHFREE_APP_ID",
    "CASHFREE_SECRET",
    "CASHFREE_WEBHOOK_SECRET",
    "CASHFREE_ENV",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_WEB_API_KEY",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY"
];

export async function onRequestGet(context) {

    const env = context.env;

    const result = { settings: {}, firebase: {}, cashfree: {} };

    NAMES.forEach(function (name) {
        result.settings[name] = env[name] ? "set" : "MISSING";
    });

    result.cashfree.mode = env.CASHFREE_ENV === "sandbox" ? "sandbox (test)" : "production (live)";

    // 1) Can the server read the Firebase database?
    try {

        if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
            throw new Error("Firebase settings are missing");
        }

        await getDoc(env, "courses/__payment_check__");

        result.firebase.ok = true;

    } catch (error) {

        result.firebase.ok = false;
        result.firebase.error = String(error.message || error).slice(0, 160);
    }

    // 2) Do the Cashfree keys work? (a missing order gives 404 = keys are fine)
    try {

        if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET) {
            throw new Error("Cashfree settings are missing");
        }

        const response = await fetch(cashfreeBase(env) + "/orders/drx_setup_check_000", {
            headers: {
                "x-client-id": env.CASHFREE_APP_ID,
                "x-client-secret": env.CASHFREE_SECRET,
                "x-api-version": "2025-01-01"
            }
        });

        if (response.status === 404) {

            result.cashfree.ok = true;

        } else if (response.status === 401 || response.status === 403) {

            result.cashfree.ok = false;
            result.cashfree.error = "Cashfree rejected the keys. Check that the Client ID and Secret are both from TEST mode and CASHFREE_ENV is sandbox.";

        } else {

            result.cashfree.ok = false;
            result.cashfree.error = "Unexpected answer from Cashfree (" + response.status + ").";
        }

    } catch (error) {

        result.cashfree.ok = false;
        result.cashfree.error = String(error.message || error).slice(0, 160);
    }

    result.ready = !!(result.firebase.ok && result.cashfree.ok);

    return json(result);
}
