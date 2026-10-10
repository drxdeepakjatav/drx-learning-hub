// Razorpay helpers (server side only)

import { HttpError } from "./http.js";

const encoder = new TextEncoder();

export async function razorpay(env, path, method, body) {

    const response = await fetch("https://api.razorpay.com/v1" + path, {
        method: method || "GET",
        headers: {
            Authorization: "Basic " + btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET),
            "Content-Type": "application/json"
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {

        console.error("Razorpay error:", JSON.stringify(data).slice(0, 300));

        throw new HttpError(502, "The payment service returned an error. Please try again.");
    }

    return data;
}

export async function hmacHex(secret, message) {

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

    return Array.from(new Uint8Array(signature))
        .map(function (b) { return b.toString(16).padStart(2, "0"); })
        .join("");
}

// compare two strings without leaking where they differ
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
