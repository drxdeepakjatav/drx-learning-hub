// Small helpers shared by all /api functions

export class HttpError extends Error {

    constructor(status, message) {
        super(message);
        this.status = status;
        this.publicMessage = message;
    }
}

export function json(data, status = 200) {

    return new Response(JSON.stringify(data), {
        status: status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

export function errorResponse(error) {

    console.error("API error:", error && error.message ? error.message : error);

    if (error instanceof HttpError) {
        return json({ error: error.publicMessage }, error.status);
    }

    return json({ error: "Something went wrong. Please try again." }, 500);
}

export function needEnv(env, names) {

    const missing = names.filter(function (name) { return !env[name]; });

    if (missing.length) {
        throw new HttpError(500, "Online payment is not configured yet (missing: " + missing.join(", ") + ").");
    }
}
