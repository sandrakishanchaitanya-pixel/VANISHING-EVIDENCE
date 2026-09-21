const socket = io();

const teamId = localStorage.getItem("ve_team_id");
const teamName = localStorage.getItem("ve_team_name");

let currentQuestionId = null;
let questionAnswered = false;
let timerInterval = null;

document.addEventListener("DOMContentLoaded", () => {

    if (!teamId) {
        window.location.href = "/";
        return;
    }

    document.getElementById("teamIdDisplay").textContent = teamId;
    document.getElementById("teamNameDisplay").textContent = teamName || "Team";
    document.getElementById("waitingTeamId").textContent = teamId;

    loadCurrentQuizState();
});


async function loadCurrentQuizState() {

    try {

        const response = await fetch("/api/quiz/state");
        const data = await response.json();

        handleQuizState(data);

    } catch (error) {
        console.error(error);
    }
}


socket.on("connect", () => {
    loadCurrentQuizState();
});


socket.on("quizState", state => {
    handleQuizState(state);
});


socket.on("questionStarted", question => {
    showQuestion(question);
});


socket.on("questionEnded", () => {

    disableOptions();

    clearInterval(timerInterval);

    document.getElementById("timer").textContent = "0";
});


socket.on("roundCompleted", async data => {

    await showRoundComplete(data);

});


socket.on("eventFinished", async () => {

    await showFinalScreen();

});


socket.on("leaderboardRevealed", () => {

    const status =
        document.getElementById("leaderboardStatus");

    if (status) {

        status.textContent =
            "🏆 LEADERBOARD REVEALED";

        status.style.color = "#00e5ff";
    }

});


function handleQuizState(state) {

    if (!state) return;

    if (
        state.status === "registration" ||
        state.status === "waiting"
    ) {

        showWaitingScreen();
        return;
    }


    if (
        state.status === "round1" ||
        state.status === "round2" ||
        state.status === "round3"
    ) {

        if (state.question) {
            showQuestion(state.question);
        } else {
            showWaitingScreen();
        }

        return;
    }


    if (state.status === "finished") {

        showFinalScreen();
    }
}


function showWaitingScreen() {

    document.getElementById("waitingScreen")
        .classList.remove("hidden");

    document.getElementById("quizScreen")
        .classList.add("hidden");

    document.getElementById("roundCompleteScreen")
        .classList.add("hidden");

    document.getElementById("finalScreen")
        .classList.add("hidden");
}


function showQuestion(question) {

    if (!question) return;

    document.getElementById("waitingScreen")
        .classList.add("hidden");

    document.getElementById("roundCompleteScreen")
        .classList.add("hidden");

    document.getElementById("finalScreen")
        .classList.add("hidden");

    document.getElementById("quizScreen")
        .classList.remove("hidden");


    currentQuestionId = question.id;
    questionAnswered = false;


    document.getElementById("roundBadge")
        .textContent =
        `ROUND ${question.round}`;


    document.getElementById("questionNumber")
        .textContent =
        question.questionNumber;


    document.getElementById("questionText")
        .textContent =
        question.question;


    document.getElementById("optionA")
        .textContent =
        question.options.A;

    document.getElementById("optionB")
        .textContent =
        question.options.B;

    document.getElementById("optionC")
        .textContent =
        question.options.C;

    document.getElementById("optionD")
        .textContent =
        question.options.D;


    document.getElementById("answerStatus")
        .classList.add("hidden");


    enableOptions();


    startTimer(
        question.timeLimit || 30,
        question.startedAt
    );
}


function startTimer(timeLimit, startedAt) {

    clearInterval(timerInterval);


    function updateTimer() {

        const elapsed =
            Math.floor(
                (
                    Date.now() -
                    new Date(startedAt).getTime()
                ) / 1000
            );


        const remaining =
            Math.max(
                0,
                timeLimit - elapsed
            );


        document.getElementById("timer")
            .textContent =
            remaining;


        if (remaining <= 5) {

            document.getElementById("timer")
                .style.color =
                "#ff5252";

        } else {

            document.getElementById("timer")
                .style.color =
                "#00e5ff";
        }


        if (remaining <= 0) {

            clearInterval(timerInterval);

            disableOptions();
        }
    }


    updateTimer();

    timerInterval =
        setInterval(
            updateTimer,
            250
        );
}


document.querySelectorAll(".answer-option")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                submitAnswer(
                    button.dataset.answer
                );

            }
        );

    });


async function submitAnswer(answer) {

    if (questionAnswered) return;

    if (!currentQuestionId) return;


    questionAnswered = true;

    disableOptions();


    document.querySelectorAll(".answer-option")
        .forEach(button => {

            if (
                button.dataset.answer ===
                answer
            ) {

                button.classList.add(
                    "selected"
                );

            }

        });


    try {

        const response =
            await fetch(
                "/api/quiz/answer",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            teamId,

                            questionId:
                                currentQuestionId,

                            answer

                        })

                }
            );


        const result =
            await response.json();


        if (!response.ok) {

            questionAnswered = false;

            enableOptions();

            return;
        }


        document.getElementById(
            "answerStatus"
        ).classList.remove("hidden");


        document.getElementById(
            "answerStatus"
        ).textContent =
            `Answer submitted • +${result.points} points`;

    } catch (error) {

        console.error(error);
    }
}


function disableOptions() {

    document.querySelectorAll(
        ".answer-option"
    ).forEach(button => {

        button.disabled = true;

    });
}


function enableOptions() {

    document.querySelectorAll(
        ".answer-option"
    ).forEach(button => {

        button.disabled = false;

        button.classList.remove(
            "selected"
        );

    });
}


async function getMyTeam() {

    try {

        const response =
            await fetch(
                `/api/teams/${teamId}`
            );

        if (!response.ok) {
            return null;
        }

        const data =
            await response.json();

        return data.team;

    } catch (error) {

        console.error(error);

        return null;
    }
}


async function showRoundComplete(data) {

    clearInterval(timerInterval);

    document.getElementById("waitingScreen")
        .classList.add("hidden");

    document.getElementById("quizScreen")
        .classList.add("hidden");

    document.getElementById("finalScreen")
        .classList.add("hidden");

    document.getElementById("roundCompleteScreen")
        .classList.remove("hidden");


    const team =
        await getMyTeam();


    const score =
        team?.score?.[
            `round${data.round}`
        ] || 0;


    document.getElementById(
        "roundScore"
    ).textContent =
        score;


    document.getElementById(
        "roundCompleteText"
    ).textContent =
        `Round ${data.round} has been completed. Your answers have been recorded.`;
}


async function showFinalScreen() {

    clearInterval(timerInterval);

    document.getElementById("waitingScreen")
        .classList.add("hidden");

    document.getElementById("quizScreen")
        .classList.add("hidden");

    document.getElementById("roundCompleteScreen")
        .classList.add("hidden");

    document.getElementById("finalScreen")
        .classList.remove("hidden");


    const team =
        await getMyTeam();


    document.getElementById(
        "finalScore"
    ).textContent =
        team?.score?.total || 0;
}