// Talks to Firebase (Firestore + login check) from the server.
// Uses a service account, so it is allowed to write enrollments.

import { HttpError } from "./http.js";

const encoder = new TextEncoder();

let cachedToken = { value: "", expires: 0 };


function base64url(input) {

    const bytes = typeof input === "string"
        ? encoder.encode(input)
        : new Uint8Array(input);

    let binary = "";

    bytes.forEach(function (b) { binary += String.fromCharCode(b); });

    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToBuffer(pem) {

    const clean = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");

    const binary = atob(clean);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}

async function getAccessToken(env) {

    const now = Math.floor(Date.now() / 1000);

    if (cachedToken.value && cachedToken.expires - 60 > now) {
        return cachedToken.value;
    }

    const header = { alg: "RS256", typ: "JWT" };

    const claims = {
        iss: env.FIREBASE_CLIENT_EMAIL,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600
    };

    const unsigned = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claims));

    const key = await crypto.subtle.importKey(
        "pkcs8",
        pemToBuffer(env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));

    const jwt = unsigned + "." + base64url(signature);

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + jwt
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error("Google token error: " + (data.error_description || data.error));
    }

    cachedToken = {
        value: data.access_token,
        expires: now + (data.expires_in || 3600)
    };

    return cachedToken.value;
}


/* ---------- login check ---------- */

export async function verifyUser(env, request) {

    const header = request.headers.get("Authorization") || "";

    const idToken = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!idToken) {
        throw new HttpError(401, "Please log in first.");
    }

    const response = await fetch(
        "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + env.FIREBASE_WEB_API_KEY,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: idToken })
        }
    );

    const data = await response.json();

    if (!response.ok || !data.users || !data.users.length) {
        throw new HttpError(401, "Your login has expired. Please log in again.");
    }

    return { uid: data.users[0].localId, email: data.users[0].email || "" };
}


/* ---------- Firestore (REST) ---------- */

function dbRoot(env) {
    return "projects/" + env.FIREBASE_PROJECT_ID + "/databases/(default)/documents";
}

function parseValue(v) {

    if ("stringValue" in v) return v.stringValue;
    if ("integerValue" in v) return Number(v.integerValue);
    if ("doubleValue" in v) return v.doubleValue;
    if ("booleanValue" in v) return v.booleanValue;
    if ("timestampValue" in v) return v.timestampValue;
    if ("nullValue" in v) return null;
    if ("arrayValue" in v) return (v.arrayValue.values || []).map(parseValue);
    if ("mapValue" in v) return parseFields(v.mapValue.fields || {});

    return null;
}

function parseFields(fields) {

    const out = {};

    Object.keys(fields).forEach(function (name) {
        out[name] = parseValue(fields[name]);
    });

    return out;
}

export async function getDoc(env, path) {

    const token = await getAccessToken(env);

    const response = await fetch(
        "https://firestore.googleapis.com/v1/" + dbRoot(env) + "/" + path,
        { headers: { Authorization: "Bearer " + token } }
    );

    if (response.status === 404) return null;

    if (!response.ok) {
        throw new Error("Firestore read failed (" + response.status + ")");
    }

    const doc = await response.json();

    return parseFields(doc.fields || {});
}

export function docName(env, path) {
    return dbRoot(env) + "/" + path;
}

export async function commit(env, writes) {

    const token = await getAccessToken(env);

    const response = await fetch(
        "https://firestore.googleapis.com/v1/" + dbRoot(env) + ":commit",
        {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ writes: writes })
        }
    );

    if (!response.ok) {

        const text = await response.text();

        throw new Error("Firestore commit failed (" + response.status + "): " + text.slice(0, 300));
    }
}
