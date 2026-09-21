/* =========================================
   VANISHING EVIDENCE
   ADMIN QUIZ CONTROLLER
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    setTimeout(() => {

        createQuizControlPanel();

        createLeaderboardButton();

        updateQuizStatus();

        setInterval(
            updateQuizStatus,
            3000
        );

    }, 500);

});


/* =========================================
   CREATE QUIZ CONTROL PANEL
========================================= */

function createQuizControlPanel() {

    if (
        document.getElementById("quizControlPanel")
    ) {
        return;
    }


    const panel =
        document.createElement("div");


    panel.id =
        "quizControlPanel";


    panel.innerHTML = `

        <div class="quiz-control-header">

            <div>

                <h2>🎬 QUIZ CONTROL</h2>

                <p>
                    Control the live detective rounds
                </p>

            </div>

            <div
                id="quizControlStatus"
                class="quiz-control-status"
            >
                REGISTRATION
            </div>

        </div>


        <div class="quiz-round-controls">

            <button
                class="quiz-round-button"
                data-round="1"
            >
                <span>ROUND 1</span>
                <small>START</small>
            </button>


            <button
                class="quiz-round-button"
                data-round="2"
            >
                <span>ROUND 2</span>
                <small>START</small>
            </button>


            <button
                class="quiz-round-button"
                data-round="3"
            >
                <span>ROUND 3</span>
                <small>START</small>
            </button>

        </div>


        <div
            id="quizControlMessage"
            class="quiz-control-message"
        >
            Waiting for the event to begin.
        </div>

    `;


    const dashboard =
        document.querySelector(".dashboard");


    if (dashboard) {

        dashboard.prepend(panel);

    } else {

        document.body.prepend(panel);

    }


    document
        .querySelectorAll(".quiz-round-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const round =
                        Number(
                            button.dataset.round
                        );

                    startRound(round);

                }
            );

        });

}


/* =========================================
   START ROUND
========================================= */

async function startRound(round) {

    const adminToken =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("admin_token");


    if (!adminToken) {

        alert(
            "Admin session not found. Please login again."
        );

        return;
    }


    const confirmed =
        confirm(
            `Start Round ${round}?\n\n` +
            `All connected player devices will receive the questions.`
        );


    if (!confirmed) {
        return;
    }


    setControlMessage(
        `Starting Round ${round}...`
    );


    try {

        const response =
            await fetch(
                "/api/admin/start-round",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "x-admin-token":
                            adminToken

                    },

                    body:
                        JSON.stringify({
                            round: round
                        })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            setControlMessage(
                result.message ||
                "Could not start round."
            );

            alert(
                result.message ||
                "Could not start round."
            );

            return;
        }


        setControlMessage(
            `Round ${round} started successfully.`
        );


        updateQuizStatus();

    } catch (error) {

        console.error(
            "Start round error:",
            error
        );


        setControlMessage(
            "Unable to connect to the server."
        );

    }

}


/* =========================================
   UPDATE QUIZ STATUS
========================================= */

async function updateQuizStatus() {

    try {

        const response =
            await fetch(
                "/api/quiz/state"
            );


        const state =
            await response.json();


        updateStatusDisplay(state);

    } catch (error) {

        console.error(
            "Quiz status error:",
            error
        );

    }

}


/* =========================================
   UPDATE STATUS DISPLAY
========================================= */

function updateStatusDisplay(state) {

    const statusElement =
        document.getElementById(
            "quizControlStatus"
        );


    if (!statusElement) {
        return;
    }


    let text =
        "REGISTRATION";


    if (
        state.status === "registration"
    ) {

        text =
            "REGISTRATION";

    } else if (
        state.status === "waiting"
    ) {

        text =
            `WAITING • ROUND ${state.currentRound} COMPLETE`;

    } else if (
        state.status === "round1"
    ) {

        text =
            "🔴 ROUND 1 LIVE";

    } else if (
        state.status === "round2"
    ) {

        text =
            "🔴 ROUND 2 LIVE";

    } else if (
        state.status === "round3"
    ) {

        text =
            "🔴 ROUND 3 LIVE";

    } else if (
        state.status === "finished"
    ) {

        text =
            "🏁 EVENT FINISHED";
    }


    statusElement.textContent =
        text;


    if (
        state.currentQuestionIndex >= 0 &&
        (
            state.status === "round1" ||
            state.status === "round2" ||
            state.status === "round3"
        )
    ) {

        setControlMessage(
            `Round ${state.currentRound} • ` +
            `Question ${state.currentQuestionIndex + 1}`
        );

    }


    updateRoundButtons(
        state.currentRound,
        state.status
    );

}


/* =========================================
   ROUND BUTTON STATE
========================================= */

function updateRoundButtons(
    currentRound,
    status
) {

    const buttons =
        document.querySelectorAll(
            ".quiz-round-button"
        );


    buttons.forEach(button => {

        const round =
            Number(
                button.dataset.round
            );


        const small =
            button.querySelector("small");


        button.disabled = false;

        button.classList.remove("active");


        if (small) {
            small.textContent = "START";
        }


        /* Currently live */

        if (
            status === `round${round}`
        ) {

            button.disabled = true;

            button.classList.add("active");

            if (small) {
                small.textContent = "LIVE";
            }

            return;
        }


        /* Registration */

        if (
            status === "registration"
        ) {

            if (round !== 1) {
                button.disabled = true;
            }

            return;
        }


        /* Waiting after a completed round */

        if (
            status === "waiting"
        ) {

            if (round <= currentRound) {

                button.disabled = true;

                if (small) {
                    small.textContent = "COMPLETED";
                }

            } else if (
                round === currentRound + 1
            ) {

                button.disabled = false;

            } else {

                button.disabled = true;
            }

            return;
        }


        /* Finished */

        if (
            status === "finished"
        ) {

            button.disabled = true;

            if (small) {
                small.textContent = "COMPLETED";
            }

        }

    });

}


/* =========================================
   LEADERBOARD BUTTON
========================================= */

function createLeaderboardButton() {

    if (
        document.getElementById(
            "revealLeaderboardButton"
        )
    ) {
        return;
    }


    const button =
        document.createElement("button");


    button.id =
        "revealLeaderboardButton";


    button.textContent =
        "🏆 REVEAL LEADERBOARD";


    button.className =
        "quiz-round-button leaderboard-reveal-button";


    button.style.marginTop =
        "15px";


    button.style.width =
        "100%";


    button.disabled =
        true;


    button.addEventListener(
        "click",
        revealLeaderboard
    );


    const panel =
        document.getElementById(
            "quizControlPanel"
        );


    if (panel) {

        panel.appendChild(button);

    }

}


/* =========================================
   UPDATE LEADERBOARD BUTTON
========================================= */

function updateLeaderboardButton(status) {

    const button =
        document.getElementById(
            "revealLeaderboardButton"
        );


    if (!button) {
        return;
    }


    if (
        status === "finished"
    ) {

        button.disabled = false;

        button.textContent =
            "🏆 REVEAL LEADERBOARD";

    } else {

        button.disabled = true;

        button.textContent =
            "🔒 LEADERBOARD LOCKED";

    }

}


/* =========================================
   REVEAL LEADERBOARD
========================================= */

async function revealLeaderboard() {

    const token =
        localStorage.getItem("adminToken") ||
        localStorage.getItem("admin_token");


    if (!token) {

        alert(
            "Admin session expired."
        );

        return;
    }


    const confirmed =
        confirm(
            "Reveal the FINAL leaderboard to everyone?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/admin/reveal-leaderboard",
                {

                    method: "POST",

                    headers: {

                        "x-admin-token":
                            token

                    }

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            alert(
                result.message ||
                "Unable to reveal leaderboard."
            );

            return;
        }


        setControlMessage(
            "🏆 FINAL LEADERBOARD REVEALED"
        );


        buttonRevealed();

    } catch (error) {

        console.error(error);

        alert(
            "Server connection error."
        );

    }

}


function buttonRevealed() {

    const button =
        document.getElementById(
            "revealLeaderboardButton"
        );


    if (!button) {
        return;
    }


    button.disabled = true;

    button.textContent =
        "🏆 LEADERBOARD REVEALED";

}


/* =========================================
   SOCKET.IO LIVE UPDATE
========================================= */

if (
    typeof io !== "undefined"
) {

    const adminSocket =
        io();


    adminSocket.on(
        "quizState",
        state => {

            updateStatusDisplay(
                state
            );

            updateLeaderboardButton(
                state.status
            );

        }
    );


    adminSocket.on(
        "questionStarted",
        question => {

            setControlMessage(
                `Round ${question.round} • ` +
                `Question ${question.questionNumber} is LIVE`
            );

        }
    );


    adminSocket.on(
        "questionEnded",
        data => {

            setControlMessage(
                `Round ${data.round} • ` +
                `Question ${data.questionNumber} ended`
            );

        }
    );


    adminSocket.on(
        "roundCompleted",
        data => {

            setControlMessage(
                `Round ${data.round} completed. ` +
                `Waiting for the organizer.`
            );

            updateQuizStatus();

        }
    );


    adminSocket.on(
        "eventFinished",
        () => {

            setControlMessage(
                "All 3 rounds completed. Leaderboard is ready."
            );

            updateLeaderboardButton(
                "finished"
            );

            updateQuizStatus();

        }
    );


    adminSocket.on(
        "leaderboardRevealed",
        () => {

            buttonRevealed();

        }
    );

}