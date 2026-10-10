/* =========================================================
   DRx LEARNING HUB - ONLINE PAYMENT (browser side)
   Opens the Razorpay window. The server (/api/...) checks the
   payment and unlocks the course automatically.
   ========================================================= */

window.DRX_PAY = (function () {

    function loadCheckout() {

        return new Promise(function (resolve, reject) {

            if (window.Razorpay) {
                resolve();
                return;
            }

            var script = document.createElement("script");

            script.src = "https://checkout.razorpay.com/v1/checkout.js";

            script.onload = resolve;

            script.onerror = function () {
                reject(new Error("Could not open the payment window. Please check your internet connection."));
            };

            document.head.appendChild(script);
        });
    }

    async function api(path, body, token) {

        var response = await fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(body)
        });

        var data = {};

        try { data = await response.json(); } catch (e) { }

        if (!response.ok && response.status !== 202) {

            throw new Error(
                data.error ||
                (response.status === 404
                    ? "Online payment is not set up on this website yet."
                    : "Request failed (" + response.status + ").")
            );
        }

        return data;
    }

    async function start(course, button, statusEl) {

        function say(text, bad) {

            if (!statusEl) return;

            statusEl.textContent = text;
            statusEl.style.color = bad ? "#b02a37" : "#0f5132";
        }

        var user = auth.currentUser;

        if (!user) {

            window.location.href =
                "login.html?next=" + encodeURIComponent("learn.html?course=" + course.id);

            return;
        }

        button.disabled = true;

        say("Starting secure payment...");

        var paymentId = "";

        try {

            var token = await user.getIdToken();

            var order = await api("/api/create-order", { courseId: course.id }, token);

            await loadCheckout();

            await new Promise(function (resolve, reject) {

                var paid = false;

                var checkout = new Razorpay({

                    key: order.keyId,
                    amount: order.amount,
                    currency: order.currency,
                    name: "DRx Learning Hub",
                    description: order.courseTitle || course.title || course.id,
                    order_id: order.orderId,

                    prefill: {
                        name: user.displayName || "",
                        email: user.email || ""
                    },

                    theme: { color: "#0b5ed7" },

                    handler: async function (response) {

                        paid = true;

                        paymentId = response.razorpay_payment_id;

                        try {

                            say("Payment received. Unlocking your course...");

                            var freshToken = await user.getIdToken(true);

                            await api("/api/verify-payment", {
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature
                            }, freshToken);

                            resolve();

                        } catch (error) {

                            reject(new Error(
                                "Your payment was received (ID: " + paymentId + "), but opening the course is taking longer. " +
                                "It will unlock automatically. If it does not open within a few minutes, please contact us with this payment ID."
                            ));
                        }
                    },

                    modal: {
                        ondismiss: function () {

                            if (!paid) reject(new Error("CANCELLED"));
                        }
                    }
                });

                checkout.on("payment.failed", function (response) {

                    reject(new Error(
                        (response.error && response.error.description) || "The payment failed. Please try again."
                    ));
                });

                checkout.open();
            });

            say("Payment successful! Your course is now unlocked.");

            setTimeout(function () { window.location.reload(); }, 1500);

        } catch (error) {

            button.disabled = false;

            if (error.message === "CANCELLED") {
                say("Payment cancelled. You were not charged.", true);
            } else {
                say(error.message || "The payment could not be completed.", true);
            }
        }
    }

    return { start: start };

})();
