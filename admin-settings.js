/* =========================================================
   DRx LEARNING HUB - ADMIN: SITE SETTINGS
   Document: settings/site   (allFree: true / false)
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    var checkbox = document.getElementById("allFree");
    var saveBtn = document.getElementById("saveBtn");
    var stateText = document.getElementById("stateText");
    var message = document.getElementById("settingsMessage");
    var logoutBtn = document.getElementById("logoutBtn");

    var currentAdmin = null;


    function showState(on) {

        stateText.textContent = on
            ? "🎉 Right now ALL study material is free for everyone."
            : "🔒 Right now only free units are open. Other units need enrollment.";
    }

    function showMessage(text, ok) {

        message.style.display = "block";
        message.className = "alert " + (ok ? "success" : "alert-error");
        message.textContent = text;
        message.style.opacity = "1";
    }


    auth.onAuthStateChanged(async function (user) {

        if (!user) {
            window.location.href = "admin-login.html";
            return;
        }

        try {

            var adminDoc = await db.collection("admins").doc(user.uid).get();

            if (!adminDoc.exists || adminDoc.data().role !== "admin") {
                await auth.signOut();
                alert("Access denied. Admin account required.");
                window.location.href = "admin-login.html";
                return;
            }

            currentAdmin = user;

            var settings = await db.collection("settings").doc("site").get();

            var on = settings.exists && settings.data().allFree === true;

            checkbox.checked = on;

            showState(on);

        } catch (error) {

            console.error(error);

            stateText.textContent = "Could not load the setting: " + error.message;
        }
    });


    saveBtn.addEventListener("click", async function () {

        if (!currentAdmin) return;

        saveBtn.disabled = true;

        try {

            await db.collection("settings").doc("site").set({
                allFree: checkbox.checked,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentAdmin.uid
            }, { merge: true });

            showState(checkbox.checked);

            showMessage("Saved. The website changes within a minute.", true);

        } catch (error) {

            console.error(error);

            showMessage("Could not save: " + error.message, false);

        } finally {

            saveBtn.disabled = false;
        }
    });


    logoutBtn.addEventListener("click", async function () {

        try {

            await auth.signOut();

            window.location.href = "admin-login.html";

        } catch (error) {

            console.error(error);

            alert("Logout failed.");
        }
    });

});
