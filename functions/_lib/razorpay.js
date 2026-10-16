// Shared Razorpay REST + HMAC helpers for Cloudflare Pages Functions.
// Keep credentials in Cloudflare Pages environment variables only.

const encoder = new TextEncoder();

export async function razorpay(env, path, method = "GET", body) {
    const keyId = env.RAZORPAY_KEY_ID;
    const keySecret = env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error("Razorpay credentials are not configured.");
    }

    const headers = {
        Authorization: "Basic " + btoa(keyId + ":" + keySecret),
        Accept: "application/json"
    };
    const options = { method, headers };

    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(body);
    }

    const response = await fetch("https://api.razorpay.com/v1" + path, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const description = data && data.error && data.error.description;
        throw new Error("Razorpay API request failed (" + response.status + ")" +
            (description ? ": " + description : "."));
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
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    let difference = a.length ^ b.length;
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i++) {
        difference |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    }
    return difference === 0;
}
