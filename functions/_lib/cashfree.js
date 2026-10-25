// Cashfree helpers (server side only)

import { HttpError } from "./http.js";

const encoder = new TextEncoder();

export function cashfreeBase(env) {

    return env.CASHFREE_ENV === "sandbox"
        ? "https://sandbox.cashfree.com/pg"
        : "https://api.cashfree.com/pg";
}

export async function cashfree(env, path, method, body) {

    const response = await fetch(cashfreeBase(env) + path, {
        method: method || "GET",
        headers: {
            "x-client-id": env.CASHFREE_APP_ID,
            "x-client-secret": env.CASHFREE_SECRET,
            "x-api-version": "2023-08-01",
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json().catch(function () { return {}; });

    if (!response.ok) {

        console.error("Cashfree error:", response.status, JSON.stringify(data).slice(0, 300));

        throw new HttpError(502, "The payment service returned an error. Please try again.");
    }

    return data;
}

// Cashfree webhook signature = base64( HMAC-SHA256( timestamp + rawBody ) )
export async function webhookSignature(secret, timestamp, rawBody) {

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(timestamp + rawBody));

    let binary = "";

    new Uint8Array(signature).forEach(function (b) { binary += String.fromCharCode(b); });

    return btoa(binary);
}

export function safeEqual(a, b) {

    a = String(a || "");
    b = String(b || "");

    if (a.length !== b.length) return false;

    let diff = 0;

    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return diff === 0;
}
