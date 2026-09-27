/* =========================================
   DRx Learning Hub
   Common Test Script
   BP102T
   ========================================= */

function submitTest() {

    const questions = document.querySelectorAll(".question");
    let score = 0;
    let attempted = 0;

    questions.forEach((question) => {

        const selected = question.querySelector(
            'input[type="radio"]:checked'
        );

        if (selected) {
            attempted++;

            if (selected.value === question.dataset.answer) {
                score++;
            }
        }
    });

    const total = questions.length;

    if (attempted < total) {
        alert("Please answer all questions before submitting the test.");
        return;
    }

    const percentage = Math.round((score / total) * 100);

    const resultBox = document.getElementById("result");

    resultBox.innerHTML = `
        <div class="result-box">
            <h2>Test Result</h2>

            <p>
                Score:
                <strong>${score} / ${total}</strong>
            </p>

            <p>
                Percentage:
                <strong>${percentage}%</strong>
            </p>

            <p>
                Status:
                <strong>
                    ${percentage >= 60 ? "PASS ✅" : "FAIL ❌"}
                </strong>
            </p>
        </div>
    `;

    resultBox.scrollIntoView({
        behavior: "smooth"
    });
}


/* RESET TEST */

function resetTest() {

    const form = document.getElementById("testForm");

    if (form) {
        form.reset();
    }

    const resultBox = document.getElementById("result");

    if (resultBox) {
        resultBox.innerHTML = "";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}