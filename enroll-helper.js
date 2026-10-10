/* =========================================================
   DRx LEARNING HUB - ENROLLMENT HELPER
   Used by signup.html and the student profile page.

   Free course : student is enrolled immediately.
   Paid course : an enrollment request is created. After the
                 payment is confirmed, the admin approves it
                 from Admin > Enrollment Requests.
   ========================================================= */

window.DRX_ENROLL = (function () {

    function priceLabel(course) {

        if (course.accessType === "free") return "FREE";

        var price = Number(course.price) || 0;

        var free = Number(course.freeUnits) || 0;

        var text = price ? "₹" + price : "Paid";

        if (free > 0) {
            text += " • first " + free + " unit" + (free > 1 ? "s" : "") + " free";
        }

        return text;
    }

    // free course: enroll the logged in student right now
    async function enrollFree(user, studentName, course, currentCourses) {

        var before = (currentCourses || []).slice();

        if (before.indexOf(course.id) !== -1) return;

        var batch = db.batch();

        batch.update(db.collection("students").doc(user.uid), {
            enrolledCourses: before.concat([course.id])
        });

        batch.set(db.collection("enrollments").doc(), {
            studentId: user.uid,
            studentName: studentName || user.displayName || "",
            studentEmail: user.email || "",
            courseId: course.id,
            courseTitle: course.title || course.id,
            enrolledAt: firebase.firestore.FieldValue.serverTimestamp(),
            enrolledBy: user.uid
        });

        await batch.commit();
    }

    // paid course: ask the admin to enroll (after payment)
    async function requestPaid(user, studentName, course) {

        await db
            .collection("enrollmentRequests")
            .doc(user.uid + "_" + course.id)
            .set({
                studentId: user.uid,
                studentName: studentName || user.displayName || "",
                studentEmail: user.email || "",
                courseId: course.id,
                courseTitle: course.title || course.id,
                status: "pending",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    }

    return {
        priceLabel: priceLabel,
        enrollFree: enrollFree,
        requestPaid: requestPaid
    };

})();
