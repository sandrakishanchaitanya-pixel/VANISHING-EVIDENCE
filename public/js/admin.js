// ==========================================
// VANISHING EVIDENCE
// ADMIN DASHBOARD
// ==========================================

const socket = io();

// ==========================================
// STATE
// ==========================================

let adminToken = localStorage.getItem("ve_admin_token");

let allQuestions = {
    round1: [],
    round2: [],
    round3: []
};

let currentRound = "round1";


// ==========================================
// ELEMENTS
// ==========================================

const loginScreen =
    document.getElementById("loginScreen");

const dashboardScreen =
    document.getElementById("dashboardScreen");

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");

const logoutButton =
    document.getElementById("logoutButton");

const questionModal =
    document.getElementById("questionModal");

const questionForm =
    document.getElementById("questionForm");

const questionList =
    document.getElementById("questionList");

const addQuestionButton =
    document.getElementById("addQuestionButton");

const closeModal =
    document.getElementById("closeModal");

const cancelQuestion =
    document.getElementById("cancelQuestion");

const modalTitle =
    document.getElementById("modalTitle");

const editingQuestionId =
    document.getElementById("editingQuestionId");

const questionRound =
    document.getElementById("questionRound");

const questionText =
    document.getElementById("questionText");

const optionA =
    document.getElementById("optionA");

const optionB =
    document.getElementById("optionB");

const optionC =
    document.getElementById("optionC");

const optionD =
    document.getElementById("optionD");

const correctAnswer =
    document.getElementById("correctAnswer");

const timeLimit =
    document.getElementById("timeLimit");

const points =
    document.getElementById("points");


// ==========================================
// INITIALIZATION
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (adminToken) {

            showDashboard();

            loadQuestions();

        } else {

            showLogin();

        }

    }
);


// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const username =
            document
                .getElementById("username")
                .value
                .trim();

        const password =
            document
                .getElementById("password")
                .value;


        loginMessage.textContent =
            "Checking credentials...";

        loginMessage.className =
            "message";


        try {

            const response =
                await fetch(
                    "/api/admin/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                username,
                                password
                            })
                    }
                );


            const data =
                await response.json();


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Login failed"
                );

            }


            adminToken =
                data.token;


            localStorage.setItem(
                "ve_admin_token",
                adminToken
            );


            loginMessage.textContent =
                "Login successful.";

            loginMessage.className =
                "message success";


            setTimeout(
                () => {

                    showDashboard();

                    loadQuestions();

                },
                300
            );


        } catch (error) {

            loginMessage.textContent =
                error.message;

            loginMessage.className =
                "message error";

        }

    }
);


// ==========================================
// SHOW LOGIN
// ==========================================

function showLogin() {

    loginScreen.classList.remove(
        "hidden"
    );

    dashboardScreen.classList.add(
        "hidden"
    );

}


// ==========================================
// SHOW DASHBOARD
// ==========================================

function showDashboard() {

    loginScreen.classList.add(
        "hidden"
    );

    dashboardScreen.classList.remove(
        "hidden"
    );

}


// ==========================================
// LOAD QUESTIONS
// ==========================================

async function loadQuestions() {

    try {

        const response =
            await fetch(
                "/api/questions"
            );


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                "Could not load questions"
            );

        }


        allQuestions =
            data.questions;


        updateQuestionCounts();

        renderQuestions();


    } catch (error) {

        console.error(error);

        questionList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⚠️
                </div>

                <h3>
                    Could not load questions
                </h3>

                <p>
                    Check that the server is running.
                </p>

            </div>

        `;

    }

}


// ==========================================
// UPDATE QUESTION COUNTS
// ==========================================

function updateQuestionCounts() {

    document.getElementById(
        "round1Count"
    ).textContent =
        allQuestions.round1?.length || 0;


    document.getElementById(
        "round2Count"
    ).textContent =
        allQuestions.round2?.length || 0;


    document.getElementById(
        "round3Count"
    ).textContent =
        allQuestions.round3?.length || 0;

}


// ==========================================
// RENDER QUESTIONS
// ==========================================

function renderQuestions() {

    const questions =
        allQuestions[currentRound] || [];


    if (questions.length === 0) {

        questionList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    🔎
                </div>

                <h3>
                    No questions yet
                </h3>

                <p>
                    Create the first question
                    for ${formatRound(currentRound)}.
                </p>

            </div>

        `;

        return;

    }


    questionList.innerHTML =
        questions
            .map(
                question =>
                    createQuestionCard(question)
            )
            .join("");

}


// ==========================================
// CREATE QUESTION CARD
// ==========================================

function createQuestionCard(question) {

    const status =
        question.published
            ? "Published"
            : "Draft";


    const statusClass =
        question.published
            ? "published"
            : "draft";


    const safeQuestion =
        escapeHTML(
            question.question
        );


    return `

        <div
            class="question-card"
            data-id="${question.id}"
        >

            <div>

                <div class="question-number">

                    ${formatRound(currentRound)}
                    · Q${question.number}

                </div>


                <div class="question-title">

                    ${safeQuestion}

                </div>


                <div class="question-meta">

                    ${question.points} pts
                    ·
                    ${question.timeLimit} sec
                    ·

                    <span class="${statusClass}">
                        ${status}
                    </span>

                </div>

            </div>


            <div class="question-actions">

                <button
                    class="edit-button"
                    onclick="editQuestion('${question.id}')"
                >
                    Edit
                </button>


                <button
                    class="delete-button"
                    onclick="deleteQuestion('${question.id}')"
                >
                    Delete
                </button>

            </div>

        </div>

    `;

}


// ==========================================
// ROUND TABS
// ==========================================

document
    .querySelectorAll(".round-tab")
    .forEach(
        tab => {

            tab.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".round-tab"
                        )
                        .forEach(
                            item =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    tab.classList.add(
                        "active"
                    );


                    currentRound =
                        tab.dataset.round;


                    renderQuestions();

                }
            );

        }
    );


// ==========================================
// OPEN CREATE QUESTION MODAL
// ==========================================

addQuestionButton.addEventListener(
    "click",
    () => {

        openCreateModal();

    }
);


function openCreateModal() {

    modalTitle.textContent =
        "Create Question";


    editingQuestionId.value = "";


    questionRound.value =
        currentRound;


    questionText.value = "";

    optionA.value = "";

    optionB.value = "";

    optionC.value = "";

    optionD.value = "";


    correctAnswer.value =
        "0";


    timeLimit.value =
        "30";


    points.value =
        "100";


    questionModal.classList.remove(
        "hidden"
    );

}


// ==========================================
// CLOSE MODAL
// ==========================================

closeModal.addEventListener(
    "click",
    closeQuestionModal
);


cancelQuestion.addEventListener(
    "click",
    closeQuestionModal
);


function closeQuestionModal() {

    questionModal.classList.add(
        "hidden"
    );

}


// ==========================================
// SAVE QUESTION
// ==========================================

questionForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const id =
            editingQuestionId.value;


        const payload = {

            round:
                questionRound.value,

            question:
                questionText.value.trim(),

            options: [

                optionA.value.trim(),

                optionB.value.trim(),

                optionC.value.trim(),

                optionD.value.trim()

            ],

            correctAnswer:
                Number(correctAnswer.value),

            timeLimit:
                Number(timeLimit.value),

            points:
                Number(points.value)

        };


        if (
            !payload.question ||
            payload.options.some(
                option => !option
            )
        ) {

            alert(
                "Please fill in the question and all four options."
            );

            return;

        }


        try {

            let response;


            if (id) {

                // EDIT

                response =
                    await fetch(
                        `/api/questions/${id}`,
                        {
                            method: "PUT",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "x-admin-token":
                                    adminToken

                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

            } else {

                // CREATE

                response =
                    await fetch(
                        "/api/questions",
                        {
                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "x-admin-token":
                                    adminToken

                            },

                            body:
                                JSON.stringify(
                                    payload
                                )
                        }
                    );

            }


            const data =
                await response.json();


            if (
                response.status === 401
            ) {

                logout();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Could not save question"
                );

            }


            closeQuestionModal();

            await loadQuestions();


            // Switch to selected round
            currentRound =
                payload.round;


            document
                .querySelectorAll(
                    ".round-tab"
                )
                .forEach(
                    tab => {

                        tab.classList.toggle(
                            "active",
                            tab.dataset.round ===
                                currentRound
                        );

                    }
                );


            renderQuestions();


        } catch (error) {

            alert(
                error.message
            );

        }

    }
);


// ==========================================
// EDIT QUESTION
// ==========================================

window.editQuestion =
    function (id) {

        const question =
            findQuestion(id);


        if (!question) {

            alert(
                "Question not found."
            );

            return;

        }


        modalTitle.textContent =
            "Edit Question";


        editingQuestionId.value =
            question.id;


        questionRound.value =
            findQuestionRound(id);


        questionText.value =
            question.question;


        optionA.value =
            question.options[0];


        optionB.value =
            question.options[1];


        optionC.value =
            question.options[2];


        optionD.value =
            question.options[3];


        correctAnswer.value =
            String(
                question.correctAnswer
            );


        timeLimit.value =
            question.timeLimit;


        points.value =
            question.points;


        questionModal.classList.remove(
            "hidden"
        );

    };


// ==========================================
// DELETE QUESTION
// ==========================================

window.deleteQuestion =
    async function (id) {

        const question =
            findQuestion(id);


        if (!question) {

            alert(
                "Question not found."
            );

            return;

        }


        const confirmed =
            confirm(
                `Delete Q${question.number}?\n\n${question.question}`
            );


        if (!confirmed) {
            return;
        }


        try {

            const response =
                await fetch(
                    `/api/questions/${id}`,
                    {
                        method: "DELETE",

                        headers: {

                            "x-admin-token":
                                adminToken

                        }

                    }
                );


            const data =
                await response.json();


            if (
                response.status === 401
            ) {

                logout();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Could not delete question"
                );

            }


            await loadQuestions();

        } catch (error) {

            alert(
                error.message
            );

        }

    };


// ==========================================
// FIND QUESTION
// ==========================================

function findQuestion(id) {

    for (
        const round of [
            "round1",
            "round2",
            "round3"
        ]
    ) {

        const questions =
            allQuestions[round] || [];


        const question =
            questions.find(
                q => q.id === id
            );


        if (question) {

            return question;

        }

    }


    return null;

}


// ==========================================
// FIND QUESTION ROUND
// ==========================================

function findQuestionRound(id) {

    for (
        const round of [
            "round1",
            "round2",
            "round3"
        ]
    ) {

        const questions =
            allQuestions[round] || [];


        if (
            questions.some(
                q => q.id === id
            )
        ) {

            return round;

        }

    }


    return currentRound;

}


// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener(
    "click",
    logout
);


function logout() {

    adminToken =
        null;


    localStorage.removeItem(
        "ve_admin_token"
    );


    showLogin();

}


// ==========================================
// SOCKET.IO QUESTION UPDATES
// ==========================================

socket.on(
    "questionsUpdated",
    () => {

        loadQuestions();

    }
);


// ==========================================
// HELPER
// ==========================================

function formatRound(round) {

    if (round === "round1") {
        return "ROUND 1";
    }

    if (round === "round2") {
        return "ROUND 2";
    }

    if (round === "round3") {
        return "ROUND 3";
    }

    return round;

}


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}