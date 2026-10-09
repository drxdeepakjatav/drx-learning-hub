/* =========================================================
   DRx LEARNING HUB - CONTACT FORM
   Saves the message in Firestore collection: contactMessages
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var form = document.getElementById("contactForm");
    var message = document.getElementById("contactMessage");
    var button = document.getElementById("contactButton");

    var nameInput = document.getElementById("contactName");
    var emailInput = document.getElementById("contactEmail");
    var subjectInput = document.getElementById("contactSubject");
    var textInput = document.getElementById("contactText");
    var honeypot = document.getElementById("contactWebsite");

    var WAIT_SECONDS = 60;


    function showMessage(text, ok) {
        message.style.display = "block";
        message.className = "alert " + (ok ? "success" : "alert-error");
        message.textContent = text;
        message.style.opacity = "1";
        message.scrollIntoView({ behavior: "smooth", block: "center" });
    }


    // Fill name and email for logged in students

    if (typeof auth !== "undefined") {

        auth.onAuthStateChanged(function (user) {

            if (!user) return;

            if (!emailInput.value) emailInput.value = user.email || "";
            if (!nameInput.value) nameInput.value = user.displayName || "";
        });
    }


    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        // bots fill hidden fields, people do not
        if (honeypot.value) return;

        if (typeof db === "undefined") {
            showMessage("Connection error. Please try again later.", false);
            return;
        }

        var name = nameInput.value.trim();
        var email = emailInput.value.trim();
        var subject = subjectInput.value;
        var text = textInput.value.trim();

        if (name.length < 2) {
            showMessage("Please enter your name.", false);
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage("Please enter a valid email address.", false);
            return;
        }

        if (text.length < 10) {
            showMessage("Please write a message of at least 10 characters.", false);
            return;
        }

        // simple limit: one message per minute from this browser
        var last = 0;

        try { last = Number(localStorage.getItem("drx_contact_last")) || 0; } catch (e) { }

        var waitLeft = Math.ceil((last + WAIT_SECONDS * 1000 - Date.now()) / 1000);

        if (waitLeft > 0) {
            showMessage("Please wait " + waitLeft + " seconds before sending another message.", false);
            return;
        }

        button.disabled = true;
        button.textContent = "Sending...";

        try {

            await db.collection("contactMessages").add({
                name: name,
                email: email,
                subject: subject,
                message: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            try { localStorage.setItem("drx_contact_last", String(Date.now())); } catch (e) { }

            form.reset();

            if (typeof auth !== "undefined" && auth.currentUser) {
                emailInput.value = auth.currentUser.email || "";
                nameInput.value = auth.currentUser.displayName || "";
            }

            showMessage("Thank you! Your message has been sent. We will reply soon.", true);

        } catch (error) {

            console.error("Contact form error:", error);

            showMessage("Sorry, your message could not be sent. Please try again later.", false);

        } finally {

            button.disabled = false;
            button.textContent = "Send Message";
        }
    });

});
