import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
    initializeAuth,
    onAuthStateChanged,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import {
    initializeFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

/* Firebase Configuration */
const firebaseConfig = {
    apiKey: "AIzaSyC-Dcvx06CGJbiqCCXlteLG3IqY3C3x8OE",
    authDomain: "drx-learning-hub.firebaseapp.com",
    projectId: "drx-learning-hub",
    storageBucket: "drx-learning-hub.firebasestorage.app",
    messagingSenderId: "562733337038",
    appId: "1:562733337038:web:2db977c4b545cb1a5f839f",
    measurementId: "G-52EGNHBYF6"
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
    persistence: browserLocalPersistence
});

const db = initializeFirestore(app, {}, "default");

const courseForm = document.getElementById("courseForm");
const courseList = document.getElementById("courseList");
const message = document.getElementById("message");
const addCourseBtn = document.getElementById("addCourseBtn");

/* Check Login */
onAuthStateChanged(auth, async (user) => {
    console.log("Courses page user:", user);

    if (!user) {
        console.log("No Firebase user found on Courses page.");

        courseList.innerHTML = `
            <div class="login-box">
                <h2>Admin Login Required</h2>
                <p>Admin session nahi mili.</p>
                <a href="admin.html">Go to Admin Login</a>
            </div>
        `;
        return;
    }

    console.log("Logged in UID:", user.uid);
    console.log("Logged in Email:", user.email);

    await loadCourses();
});

/* Add Course */
courseForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;

    console.log("AUTH USER:", user);
    console.log("AUTH UID:", user?.uid);

    if (!user) {
        showMessage("❌ Admin login session nahi mili.", "error");
        return;
    }

    addCourseBtn.disabled = true;
    addCourseBtn.textContent = "Saving...";
    showMessage("Saving course...", "info");

    try {
        await addDoc(collection(db, "courses"), {
            name: document.getElementById("courseName").value.trim(),
            category: document.getElementById("category").value,
            semester: document.getElementById("semester").value.trim(),
            code: document.getElementById("courseCode").value.trim(),
            description: document.getElementById("description").value.trim(),
            link: document.getElementById("courseLink").value.trim(),
            createdAt: serverTimestamp()
        });

        showMessage("✅ Course added successfully!", "success");
        courseForm.reset();
        await loadCourses();

    } catch (error) {
        console.error("Course Error:", error);
        showMessage("❌ Error: " + error.code + " - " + error.message, "error");
    }

    addCourseBtn.disabled = false;
    addCourseBtn.textContent = "➕ Add Course";
});

/* Load Courses */
async function loadCourses() {
    courseList.innerHTML = "Loading courses...";

    try {
        const snapshot = await getDocs(collection(db, "courses"));

        if (snapshot.empty) {
            courseList.innerHTML = "<p>No courses added yet.</p>";
            return;
        }

        courseList.innerHTML = "";

        snapshot.forEach((courseDoc) => {
            const course = courseDoc.data();
            const div = document.createElement("div");

            div.className = "course";

            div.innerHTML = `
                <span class="badge">${escapeHTML(course.category || "Course")}</span>
                <h3>${escapeHTML(course.name || "Untitled Course")}</h3>
                <p><strong>Code:</strong> ${escapeHTML(course.code || "-")}</p>
                <p><strong>Semester:</strong> ${escapeHTML(course.semester || "-")}</p>
                <p>${escapeHTML(course.description || "")}</p>
                ${
                    course.link
                    ? `<a class="course-link" href="${escapeAttribute(course.link)}" target="_blank" rel="noopener noreferrer">
                         🔗 ${escapeHTML(course.link)}
                       </a>`
                    : ""
                }
                <br>
                <button class="delete-btn" data-id="${courseDoc.id}">🗑 Delete</button>
            `;

            courseList.appendChild(div);
        });

        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", async () => {
                const id = button.dataset.id;

                if (!confirm("Delete this course?")) return;

                try {
                    await deleteDoc(doc(db, "courses", id));
                    showMessage("✅ Course deleted successfully!", "success");
                    await loadCourses();
                } catch (error) {
                    console.error("Delete Error:", error);
                    showMessage("❌ Delete failed: " + error.message, "error");
                }
            });
        });

    } catch (error) {
        console.error("Load Courses Error:", error);

        courseList.innerHTML = `<p class="error">Failed to load courses.</p>`;
        showMessage("❌ " + error.code + " - " + error.message, "error");
    }
}

function showMessage(text, type) {
    message.className = type;
    message.textContent = text;
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}
