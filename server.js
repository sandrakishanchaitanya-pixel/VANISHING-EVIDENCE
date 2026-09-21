const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;


/* =========================================================
   FILE PATHS
========================================================= */

const DATA_DIR = path.join(__dirname, "data");

const QUESTIONS_FILE =
    path.join(DATA_DIR, "questions.json");

const TEAMS_FILE =
    path.join(DATA_DIR, "teams.json");

const EVENT_FILE =
    path.join(DATA_DIR, "event.json");


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/* =========================================================
   JSON HELPERS
========================================================= */

function readJSON(file) {

    try {

        if (!fs.existsSync(file)) {
            return {};
        }

        const content =
            fs.readFileSync(file, "utf8");

        if (!content.trim()) {
            return {};
        }

        return JSON.parse(content);

    } catch (error) {

        console.error(
            "Error reading file:",
            file
        );

        console.error(error);

        return {};
    }
}


function writeJSON(file, data) {

    try {

        fs.writeFileSync(
            file,
            JSON.stringify(data, null, 2),
            "utf8"
        );

        return true;

    } catch (error) {

        console.error(
            "Error writing file:",
            file
        );

        console.error(error);

        return false;
    }
}


/* =========================================================
   ADMIN SESSION SYSTEM
========================================================= */

const adminSessions = new Set();


function createAdminToken() {

    return crypto
        .randomBytes(32)
        .toString("hex");
}


function requireAdmin(req, res, next) {

    const token =
        req.headers["x-admin-token"];

    if (
        !token ||
        !adminSessions.has(token)
    ) {

        return res.status(401).json({

            success: false,

            message:
                "Admin authentication required"

        });
    }

    next();
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
    "/api/admin/login",
    (req, res) => {

        const {
            username,
            password
        } = req.body;


        const correctUsername =
            username ===
            process.env.ADMIN_USERNAME;


        const correctPassword =
            password ===
            process.env.ADMIN_PASSWORD;


        if (
            !correctUsername ||
            !correctPassword
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid admin username or password"

            });
        }


        const token =
            createAdminToken();


        adminSessions.add(token);


        res.json({

            success: true,

            token,

            message:
                "Admin login successful"

        });
    }
);


/* =========================================================
   GET ALL QUESTIONS
========================================================= */

app.get(
    "/api/questions",
    (req, res) => {

        const questions =
            readJSON(QUESTIONS_FILE);


        res.json({

            success: true,

            questions

        });
    }
);


/* =========================================================
   ADD QUESTION
========================================================= */

app.post(
    "/api/questions",
    requireAdmin,
    (req, res) => {

        const {
            round,
            question,
            options,
            correctAnswer,
            timeLimit,
            points
        } = req.body;


        /* Validate round */

        if (
            ![
                "round1",
                "round2",
                "round3"
            ].includes(round)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid round selected"

            });
        }


        /* Validate question */

        if (
            !question ||
            !String(question).trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Question cannot be empty"

            });
        }


        /* Validate options */

        if (
            !Array.isArray(options) ||
            options.length !== 4
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Exactly 4 options are required"

            });
        }


        if (
            options.some(
                option =>
                    !option ||
                    !String(option).trim()
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "All four options are required"

            });
        }


        /* Validate correct answer */

        const answer =
            Number(correctAnswer);


        if (
            answer < 0 ||
            answer > 3 ||
            !Number.isInteger(answer)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Select a valid correct answer"

            });
        }


        /* Read questions */

        const data =
            readJSON(QUESTIONS_FILE);


        if (!data[round]) {
            data[round] = [];
        }


        /* Generate number */

        const number =
            data[round].length + 1;


        /* Create question */

        const newQuestion = {

            id:
                crypto.randomUUID(),

            number,

            question:
                String(question).trim(),

            options:
                options.map(
                    option =>
                        String(option).trim()
                ),

            correctAnswer:
                answer,

            timeLimit:
                Number(timeLimit) || 30,

            points:
                Number(points) || 100,

            published:
                true,

            createdAt:
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString()
        };


        /* Save */

        data[round].push(
            newQuestion
        );


        const saved =
            writeJSON(
                QUESTIONS_FILE,
                data
            );


        if (!saved) {

            return res.status(500).json({

                success: false,

                message:
                    "Could not save question"

            });
        }


        res.json({

            success: true,

            message:
                "Question created successfully",

            question:
                newQuestion

        });


        io.emit(
            "questionsUpdated"
        );
    }
);


/* =========================================================
   UPDATE QUESTION
========================================================= */

app.put(
    "/api/questions/:id",
    requireAdmin,
    (req, res) => {

        const questionId =
            req.params.id;


        const data =
            readJSON(QUESTIONS_FILE);


        let foundQuestion = null;
        let foundRound = null;


        for (
            const round of [
                "round1",
                "round2",
                "round3"
            ]
        ) {

            if (!data[round]) {
                continue;
            }


            const index =
                data[round].findIndex(
                    q =>
                        q.id === questionId
                );


            if (index !== -1) {

                foundQuestion =
                    data[round][index];

                foundRound =
                    round;

                break;
            }
        }


        if (!foundQuestion) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found"

            });
        }


        const {
            question,
            options,
            correctAnswer,
            timeLimit,
            points,
            published
        } = req.body;


        if (
            question !== undefined
        ) {

            foundQuestion.question =
                String(question).trim();
        }


        if (
            options !== undefined
        ) {

            if (
                !Array.isArray(options) ||
                options.length !== 4
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Exactly 4 options are required"

                });
            }


            foundQuestion.options =
                options.map(
                    option =>
                        String(option).trim()
                );
        }


        if (
            correctAnswer !== undefined
        ) {

            const answer =
                Number(correctAnswer);


            if (
                !Number.isInteger(answer) ||
                answer < 0 ||
                answer > 3
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid correct answer"

                });
            }


            foundQuestion.correctAnswer =
                answer;
        }


        if (
            timeLimit !== undefined
        ) {

            foundQuestion.timeLimit =
                Number(timeLimit);
        }


        if (
            points !== undefined
        ) {

            foundQuestion.points =
                Number(points);
        }


        if (
            published !== undefined
        ) {

            foundQuestion.published =
                Boolean(published);
        }


        foundQuestion.updatedAt =
            new Date().toISOString();


        writeJSON(
            QUESTIONS_FILE,
            data
        );


        res.json({

            success: true,

            message:
                "Question updated successfully",

            question:
                foundQuestion,

            round:
                foundRound

        });


        io.emit(
            "questionsUpdated"
        );
    }
);


/* =========================================================
   DELETE QUESTION
========================================================= */

app.delete(
    "/api/questions/:id",
    requireAdmin,
    (req, res) => {

        const questionId =
            req.params.id;


        const data =
            readJSON(QUESTIONS_FILE);


        let deleted = false;


        for (
            const round of [
                "round1",
                "round2",
                "round3"
            ]
        ) {

            if (!data[round]) {
                continue;
            }


            const oldLength =
                data[round].length;


            data[round] =
                data[round].filter(
                    q =>
                        q.id !== questionId
                );


            if (
                data[round].length !==
                oldLength
            ) {

                deleted = true;


                /* Re-number questions */

                data[round].forEach(
                    (q, index) => {

                        q.number =
                            index + 1;

                    }
                );

                break;
            }
        }


        if (!deleted) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found"

            });
        }


        writeJSON(
            QUESTIONS_FILE,
            data
        );


        res.json({

            success: true,

            message:
                "Question deleted successfully"

        });


        io.emit(
            "questionsUpdated"
        );
    }
);


/* =========================================================
   TEAM REGISTRATION
========================================================= */

function getAllTeamIds() {

    const ids = [];


    for (
        let i = 1;
        i <= 99;
        i++
    ) {

        ids.push(
            `VE${String(i).padStart(2, "0")}`
        );
    }


    return ids;
}


/* =========================================================
   GET AVAILABLE TEAM IDS
========================================================= */

app.get(
    "/api/teams/available",
    (req, res) => {

        const data =
            readJSON(TEAMS_FILE);


        const registeredTeams =
            data.teams || [];


        const registeredIds =
            new Set(
                registeredTeams.map(
                    team =>
                        team.teamId
                )
            );


        const allIds =
            getAllTeamIds();


        const availableIds =
            allIds.filter(
                id =>
                    !registeredIds.has(id)
            );


        res.json({

            success: true,

            availableTeamIds:
                availableIds,

            remaining:
                availableIds.length

        });
    }
);


/* =========================================================
   REGISTER TEAM
========================================================= */

app.post(
    "/api/teams/register",
    (req, res) => {

        const {
            teamId,
            teamName,
            members
        } = req.body;


        /* Validate Team ID */

        const validIds =
            getAllTeamIds();


        if (
            !validIds.includes(teamId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid Team ID."

            });
        }


        /* Read teams */

        const data =
            readJSON(TEAMS_FILE);


        if (!data.teams) {
            data.teams = [];
        }


        /* Duplicate team */

        const existingTeam =
            data.teams.find(
                team =>
                    team.teamId === teamId
            );


        if (existingTeam) {

            return res.status(409).json({

                success: false,

                message:
                    "This Team ID has already been registered."

            });
        }


        /* Validate team name */

        if (
            !teamName ||
            !String(teamName).trim()
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Team name is required."

            });
        }


        /* Validate members */

        if (
            !Array.isArray(members) ||
            members.length < 2 ||
            members.length > 4
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "A team must have 2 to 4 members."

            });
        }


        /* Validate each member */

        for (
            const member of members
        ) {

            if (
                !member.rollNumber ||
                !member.name
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Every member needs a roll number and name."

                });
            }
        }


        /* Duplicate roll numbers */

        const rollNumbers =
            members.map(
                member =>
                    String(member.rollNumber)
                        .trim()
                        .toUpperCase()
            );


        const uniqueRollNumbers =
            new Set(rollNumbers);


        if (
            uniqueRollNumbers.size !==
            rollNumbers.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Duplicate roll numbers are not allowed."

            });
        }


        /* Create team */

        const team = {

            teamId,

            teamName:
                String(teamName).trim(),

            members:
                members.map(
                    member => ({

                        rollNumber:
                            String(member.rollNumber)
                                .trim()
                                .toUpperCase(),

                        name:
                            String(member.name)
                                .trim()

                    })
                ),

            registeredAt:
                new Date().toISOString(),

            status:
                "registered",

            score: {

                round1: 0,

                round2: 0,

                round3: 0,

                total: 0

            },

            statistics: {

                correctAnswers: 0,

                answeredQuestions: 0,

                totalAnswerTime: 0

            },

            answers: {}

        };


        /* Save */

        data.teams.push(team);


        const saved =
            writeJSON(
                TEAMS_FILE,
                data
            );


        if (!saved) {

            return res.status(500).json({

                success: false,

                message:
                    "Could not save team."

            });
        }


        res.status(201).json({

            success: true,

            message:
                "Team registered successfully.",

            team: {

                teamId:
                    team.teamId,

                teamName:
                    team.teamName,

                members:
                    team.members

            }

        });


        io.emit(
            "teamsUpdated"
        );
    }
);


/* =========================================================
   GET TEAM INFORMATION
========================================================= */

app.get(
    "/api/teams/:teamId",
    (req, res) => {

        const teamId =
            req.params.teamId;


        const data =
            readJSON(TEAMS_FILE);


        const team =
            (data.teams || []).find(
                item =>
                    item.teamId === teamId
            );


        if (!team) {

            return res.status(404).json({

                success: false,

                message:
                    "Team not found."

            });
        }


        res.json({

            success: true,

            team

        });
    }
);


/* =========================================================
   EVENT INFORMATION
========================================================= */

app.get(
    "/api/event",
    (req, res) => {

        const event =
            readJSON(EVENT_FILE);


        res.json({

            success: true,

            event

        });
    }
);


/* =========================================================
   QUIZ ENGINE
========================================================= */

let quizState = {

    status:
        "registration",

    currentRound:
        0,

    currentQuestionIndex:
        -1,

    currentQuestionId:
        null,

    questionStartedAt:
        null,

    questionEndsAt:
        null,

    leaderboardVisible:
        false,

    timer:
        null

};


/* =========================================================
   GET QUESTIONS FOR ROUND
========================================================= */

function getRoundQuestions(roundNumber) {

    const questionsData =
        readJSON(QUESTIONS_FILE);


    const roundKey =
        `round${roundNumber}`;


    const questions =
        questionsData[roundKey] || [];


    /*
       Only published questions are used.
       Existing questions default to published=true.
    */

    return questions.filter(
        question =>
            question.published !== false
    );
}


/* =========================================================
   CREATE SAFE QUESTION
   CORRECT ANSWER IS NEVER SENT
========================================================= */

function getSafeQuestion(
    question,
    roundNumber,
    index
) {

    return {

        id:
            question.id,

        round:
            roundNumber,

        questionNumber:
            index + 1,

        question:
            question.question,

        options: {

            A:
                question.options[0],

            B:
                question.options[1],

            C:
                question.options[2],

            D:
                question.options[3]

        },

        timeLimit:
            Number(question.timeLimit) || 30,

        startedAt:
            quizState.questionStartedAt

    };
}


/* =========================================================
   BROADCAST QUIZ STATE
========================================================= */

function broadcastQuizState() {

    const state = {

        status:
            quizState.status,

        currentRound:
            quizState.currentRound,

        currentQuestionIndex:
            quizState.currentQuestionIndex,

        leaderboardVisible:
            quizState.leaderboardVisible

    };


    if (
        quizState.currentRound > 0 &&
        quizState.currentQuestionIndex >= 0
    ) {

        const questions =
            getRoundQuestions(
                quizState.currentRound
            );


        const question =
            questions[
                quizState.currentQuestionIndex
            ];


        if (question) {

            state.question =
                getSafeQuestion(
                    question,
                    quizState.currentRound,
                    quizState.currentQuestionIndex
                );
        }
    }


    io.emit(
        "quizState",
        state
    );
}


/* =========================================================
   START QUIZ ROUND
========================================================= */

function startQuizRound(
    roundNumber
) {

    const questions =
        getRoundQuestions(
            roundNumber
        );


    if (!questions.length) {

        console.log(
            `Cannot start Round ${roundNumber}: no questions`
        );

        return false;
    }


    if (quizState.timer) {

        clearTimeout(
            quizState.timer
        );

        quizState.timer =
            null;
    }


    quizState.status =
        `round${roundNumber}`;


    quizState.currentRound =
        roundNumber;


    quizState.currentQuestionIndex =
        0;


    quizState.leaderboardVisible =
        false;


    startCurrentQuestion();


    return true;
}


/* =========================================================
   START CURRENT QUESTION
========================================================= */

function startCurrentQuestion() {

    const questions =
        getRoundQuestions(
            quizState.currentRound
        );


    const question =
        questions[
            quizState.currentQuestionIndex
        ];


    if (!question) {

        completeCurrentRound();

        return;
    }


    const timeLimit =
        Number(question.timeLimit) || 30;


    quizState.currentQuestionId =
        question.id;


    quizState.questionStartedAt =
        new Date().toISOString();


    quizState.questionEndsAt =
        Date.now() +
        timeLimit * 1000;


    const safeQuestion =
        getSafeQuestion(
            question,
            quizState.currentRound,
            quizState.currentQuestionIndex
        );


    console.log(
        `Round ${quizState.currentRound} - Question ${quizState.currentQuestionIndex + 1} started`
    );


    io.emit(
        "questionStarted",
        safeQuestion
    );


    broadcastQuizState();


    quizState.timer =
        setTimeout(
            () => {

                endCurrentQuestion();

            },
            timeLimit * 1000
        );
}


/* =========================================================
   END CURRENT QUESTION
========================================================= */

function endCurrentQuestion() {

    if (quizState.timer) {

        clearTimeout(
            quizState.timer
        );

        quizState.timer =
            null;
    }


    io.emit(
        "questionEnded",
        {

            round:
                quizState.currentRound,

            questionNumber:
                quizState.currentQuestionIndex + 1

        }
    );


    /*
       One second gap between questions.
    */

    setTimeout(
        () => {

            nextQuestion();

        },
        1000
    );
}


/* =========================================================
   NEXT QUESTION
========================================================= */

function nextQuestion() {

    const questions =
        getRoundQuestions(
            quizState.currentRound
        );


    quizState.currentQuestionIndex++;


    if (
        quizState.currentQuestionIndex >=
        questions.length
    ) {

        completeCurrentRound();

        return;
    }


    startCurrentQuestion();
}


/* =========================================================
   COMPLETE ROUND
========================================================= */

function completeCurrentRound() {

    if (quizState.timer) {

        clearTimeout(
            quizState.timer
        );

        quizState.timer =
            null;
    }


    const completedRound =
        quizState.currentRound;


    quizState.currentQuestionId =
        null;


    quizState.questionStartedAt =
        null;


    quizState.questionEndsAt =
        null;


    /*
       Round 3 means the complete event is finished.
    */

    if (
        completedRound >= 3
    ) {

        quizState.status =
            "finished";


        quizState.currentRound =
            3;


        quizState.currentQuestionIndex =
            -1;


        console.log(
            "ALL THREE ROUNDS COMPLETED"
        );


        /*
           Leaderboard remains locked.
           Admin will reveal it later.
        */

        quizState.leaderboardVisible =
            false;


        io.emit(
            "eventFinished",
            {

                totalScore:
                    null

            }
        );


        broadcastQuizState();


        return;
    }


    /*
       Waiting for admin to start next round.
    */

    quizState.status =
        "waiting";


    quizState.currentQuestionIndex =
        -1;


    io.emit(
        "roundCompleted",
        {

            round:
                completedRound

        }
    );


    broadcastQuizState();
}


/* =========================================================
   QUIZ STATE API
========================================================= */

app.get(
    "/api/quiz/state",
    (req, res) => {

        const response = {

            status:
                quizState.status,

            currentRound:
                quizState.currentRound,

            currentQuestionIndex:
                quizState.currentQuestionIndex,

            leaderboardVisible:
                quizState.leaderboardVisible

        };


        if (
            quizState.currentRound > 0 &&
            quizState.currentQuestionIndex >= 0
        ) {

            const questions =
                getRoundQuestions(
                    quizState.currentRound
                );


            const question =
                questions[
                    quizState.currentQuestionIndex
                ];


            if (question) {

                response.question =
                    getSafeQuestion(
                        question,
                        quizState.currentRound,
                        quizState.currentQuestionIndex
                    );
            }
        }


        res.json(response);
    }
);


/* =========================================================
   ADMIN START ROUND
========================================================= */

app.post(
    "/api/admin/start-round",
    requireAdmin,
    (req, res) => {

        const roundNumber =
            Number(req.body.round);


        if (
            ![1, 2, 3].includes(
                roundNumber
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid round"

            });
        }


        /*
           Prevent starting another round
           while a round is already running.
        */

        if (
            quizState.status === "round1" ||
            quizState.status === "round2" ||
            quizState.status === "round3"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "A round is already running."

            });
        }


        /*
           Round 2 should only start after Round 1.
        */

        if (
            roundNumber === 2 &&
            quizState.currentRound < 1
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Round 1 must be completed first."

            });
        }


        /*
           Round 3 should only start after Round 2.
        */

        if (
            roundNumber === 3 &&
            quizState.currentRound < 2
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Round 2 must be completed first."

            });
        }


        const success =
            startQuizRound(
                roundNumber
            );


        if (!success) {

            return res.status(400).json({

                success: false,

                message:
                    `Round ${roundNumber} has no questions`

            });
        }


        res.json({

            success: true,

            message:
                `Round ${roundNumber} started`

        });
    }
);


/* =========================================================
   PLAYER ANSWER
========================================================= */

app.post(
    "/api/quiz/answer",
    (req, res) => {

        const {
            teamId,
            questionId,
            answer
        } = req.body;


        /* Validate request */

        if (
            !teamId ||
            !questionId ||
            !answer
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Missing answer information"

            });
        }


        const selectedAnswer =
            String(answer)
                .trim()
                .toUpperCase();


        if (
            !["A", "B", "C", "D"]
                .includes(selectedAnswer)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid answer"

            });
        }


        /*
           Make sure the question is still active.
        */

        if (
            !quizState.currentQuestionId ||
            quizState.currentQuestionId !==
                questionId
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This question is no longer active"

            });
        }


        /*
           Make sure time hasn't expired.
        */

        if (
            Date.now() >
            quizState.questionEndsAt
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Time is over"

            });
        }


        /* Read teams */

        const teamsData =
            readJSON(TEAMS_FILE);


        if (
            !Array.isArray(
                teamsData.teams
            )
        ) {

            return res.status(500).json({

                success: false,

                message:
                    "Team data is unavailable"

            });
        }


        /* Find team */

        const teamIndex =
            teamsData.teams.findIndex(
                team =>
                    team.teamId === teamId
            );


        if (
            teamIndex === -1
        ) {

            return res.status(404).json({

                success: false,

                message:
                    "Team not found"

            });
        }


        const team =
            teamsData.teams[teamIndex];


        /* Initialize answers */

        if (!team.answers) {

            team.answers = {};
        }


        /*
           Unique key for this team's
           answer to this question.
        */

        const answerKey =
            `${quizState.currentRound}_${questionId}`;


        /*
           Prevent duplicate submission.
        */

        if (
            team.answers[answerKey]
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Answer already submitted"

            });
        }


        /* Find active question */

        const questions =
            getRoundQuestions(
                quizState.currentRound
            );


        const question =
            questions.find(
                q =>
                    q.id === questionId
            );


        if (!question) {

            return res.status(404).json({

                success: false,

                message:
                    "Question not found"

            });
        }


        /* Calculate response time */

        const elapsedMs =
            Date.now() -
            new Date(
                quizState.questionStartedAt
            ).getTime();


        const timeLimit =
            Number(
                question.timeLimit
            ) || 30;


        const elapsedSeconds =
            Math.max(
                0,
                Math.min(
                    timeLimit,
                    Math.floor(
                        elapsedMs / 1000
                    )
                )
            );


        /*
           Convert:

           A = 0
           B = 1
           C = 2
           D = 3
        */

        const answerIndex = {

            A: 0,

            B: 1,

            C: 2,

            D: 3

        };


        const selectedIndex =
            answerIndex[
                selectedAnswer
            ];


        /*
           correctAnswer is stored as
           0, 1, 2 or 3.
        */

        const isCorrect =
            selectedIndex ===
            Number(
                question.correctAnswer
            );


        let points = 0;

        let speedBonus = 0;


        /* Calculate score */

        if (isCorrect) {

            const basePoints =
                Number(
                    question.points
                ) || 100;


            /*
               Speed bonus:

               0–5 sec   = +50
               6–10 sec  = +40
               11–15 sec = +30
               16–20 sec = +20
               21–25 sec = +10
               26+ sec   = +0
            */

            if (
                elapsedSeconds <= 5
            ) {

                speedBonus = 50;

            } else if (
                elapsedSeconds <= 10
            ) {

                speedBonus = 40;

            } else if (
                elapsedSeconds <= 15
            ) {

                speedBonus = 30;

            } else if (
                elapsedSeconds <= 20
            ) {

                speedBonus = 20;

            } else if (
                elapsedSeconds <= 25
            ) {

                speedBonus = 10;

            } else {

                speedBonus = 0;
            }


            points =
                basePoints +
                speedBonus;
        }


        /* Initialize score */

        if (!team.score) {

            team.score = {

                round1: 0,

                round2: 0,

                round3: 0,

                total: 0

            };
        }


        /* Initialize statistics */

        if (!team.statistics) {

            team.statistics = {

                correctAnswers: 0,

                answeredQuestions: 0,

                totalAnswerTime: 0

            };
        }


        /* Current round */

        const roundKey =
            `round${quizState.currentRound}`;


        /* Add round score */

        team.score[roundKey] =
            (
                team.score[roundKey] || 0
            ) + points;


        /* Add total score */

        team.score.total =
            (
                team.score.total || 0
            ) + points;


        /* Statistics */

        team.statistics
            .answeredQuestions++;


        team.statistics
            .totalAnswerTime +=
                elapsedSeconds;


        if (isCorrect) {

            team.statistics
                .correctAnswers++;
        }


        /* Store answer */

        team.answers[answerKey] = {

            answer:
                selectedAnswer,

            correct:
                isCorrect,

            points:

                points,

            speedBonus:

                speedBonus,

            responseTime:

                elapsedSeconds,

            submittedAt:
                new Date().toISOString()

        };


        /* Save team */

        teamsData.teams[teamIndex] =
            team;


        const saved =
            writeJSON(
                TEAMS_FILE,
                teamsData
            );


        if (!saved) {

            return res.status(500).json({

                success: false,

                message:
                    "Could not save answer"

            });
        }


        /*
           Notify admin dashboards
           that scores changed.
        */

        io.emit(
            "scoresUpdated"
        );


        /* Send result */

        res.json({

            success: true,

            correct:
                isCorrect,

            points:
                points,

            speedBonus:
                speedBonus,

            responseTime:
                elapsedSeconds,

            round:
                quizState.currentRound,

            totalScore:
                team.score.total

        });
    }
);


/* =========================================================
   ADMIN GET ALL TEAMS / SCORES
========================================================= */

app.get(
    "/api/admin/teams",
    requireAdmin,
    (req, res) => {

        const data =
            readJSON(TEAMS_FILE);


        const teams =
            (data.teams || [])
                .map(team => ({

                    teamId:
                        team.teamId,

                    teamName:
                        team.teamName,

                    members:
                        team.members,

                    score:
                        team.score,

                    statistics:
                        team.statistics,

                    registeredAt:
                        team.registeredAt

                }));


        res.json({

            success: true,

            teams

        });
    }
);
/* =========================================================
   ADMIN RESET EVENT
========================================================= */

app.post(
    "/api/admin/reset-event",
    requireAdmin,
    (req, res) => {

        try {

            /*
             * Clear all registered teams.
             * Questions are NOT deleted.
             */

            const teamsReset = writeJSON(
                TEAMS_FILE,
                {
                    teams: []
                }
            );


            if (!teamsReset) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Could not reset team data."

                });

            }


            /*
             * Stop any active quiz timer.
             */

            if (quizState.timer) {

                clearTimeout(
                    quizState.timer
                );

                quizState.timer = null;

            }


            /*
             * Reset quiz state.
             */

            quizState.status =
                "registration";

            quizState.currentRound =
                0;

            quizState.currentQuestionIndex =
                -1;

            quizState.currentQuestionId =
                null;

            quizState.questionStartedAt =
                null;

            quizState.questionEndsAt =
                null;

            quizState.leaderboardVisible =
                false;


            /*
             * Tell all connected players
             * that the event has been reset.
             */

            io.emit(
                "quizState",
                {
                    status: "registration",

                    currentRound: 0,

                    currentQuestionIndex: -1,

                    currentQuestionId: null,

                    leaderboardVisible: false
                }
            );


            io.emit(
                "eventReset"
            );


            console.log(
                "EVENT RESET: Teams cleared and quiz returned to registration."
            );


            res.json({

                success: true,

                message:
                    "Event reset successfully."

            });


        } catch (error) {

            console.error(
                "Reset event error:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Failed to reset event."

            });

        }

    }
);

/* =========================================================
   ADMIN REVEAL LEADERBOARD
========================================================= */

app.post(
    "/api/admin/reveal-leaderboard",
    requireAdmin,
    (req, res) => {

        if (
            quizState.status !==
            "finished"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "The leaderboard can only be revealed after all three rounds."

            });
        }


        quizState.leaderboardVisible =
            true;


        io.emit(
            "leaderboardRevealed"
        );


        broadcastQuizState();


        res.json({

            success: true,

            message:
                "Leaderboard revealed"

        });
    }
);


/* =========================================================
   PUBLIC LEADERBOARD
========================================================= */

app.get(
    "/api/leaderboard",
    (req, res) => {

        if (
            !quizState.leaderboardVisible
        ) {

            return res.json({

                success: true,

                visible: false,

                leaderboard: []

            });
        }


        const data =
            readJSON(TEAMS_FILE);


        const teams =
            (data.teams || [])
                .map(team => ({

                    teamId:
                        team.teamId,

                    teamName:
                        team.teamName,

                    score:
                        team.score || {

                            round1: 0,

                            round2: 0,

                            round3: 0,

                            total: 0

                        },

                    statistics:
                        team.statistics || {

                            correctAnswers: 0,

                            answeredQuestions: 0,

                            totalAnswerTime: 0

                        }

                }));


        /*
           Ranking:

           1. Total score
           2. Correct answers
           3. Lower total response time
        */

        teams.sort(
            (a, b) => {

                if (
                    b.score.total !==
                    a.score.total
                ) {

                    return (
                        b.score.total -
                        a.score.total
                    );
                }


                if (
                    b.statistics.correctAnswers !==
                    a.statistics.correctAnswers
                ) {

                    return (
                        b.statistics.correctAnswers -
                        a.statistics.correctAnswers
                    );
                }


                return (
                    a.statistics.totalAnswerTime -
                    b.statistics.totalAnswerTime
                );
            }
        );


        const leaderboard =
            teams.map(
                (team, index) => ({

                    rank:
                        index + 1,

                    teamId:
                        team.teamId,

                    teamName:
                        team.teamName,

                    round1:
                        team.score.round1 || 0,

                    round2:
                        team.score.round2 || 0,

                    round3:
                        team.score.round3 || 0,

                    total:
                        team.score.total || 0,

                    correctAnswers:
                        team.statistics.correctAnswers || 0,

                    totalAnswerTime:
                        team.statistics.totalAnswerTime || 0

                })
            );


        res.json({

            success: true,

            visible: true,

            leaderboard

        });
    }
);


/* =========================================================
   SOCKET.IO
========================================================= */

io.on(
    "connection",
    socket => {

        console.log(
            "Client connected:",
            socket.id
        );


        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Client disconnected:",
                    socket.id
                );
            }
        );
    }
);


/* =========================================================
   SERVER STATUS
========================================================= */

app.get(
    "/api/status",
    (req, res) => {

        res.json({

            status:
                "online",

            event:
                "Vanishing Evidence",

            serverTime:
                new Date().toISOString(),

            quizStatus:
                quizState.status,

            currentRound:
                quizState.currentRound,

            currentQuestion:
                quizState.currentQuestionIndex + 1

        });
    }
);


/* =========================================================
   START SERVER
========================================================= */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");

        console.log(
            "======================================"
        );

        console.log(
            "       VANISHING EVIDENCE"
        );

        console.log(
            "       DETECTIVE SERVER"
        );

        console.log(
            "======================================"
        );

        console.log("");

        console.log(
            `Local: http://localhost:${PORT}`
        );

        console.log("");

        console.log(
            "Admin username:",
            process.env.ADMIN_USERNAME
        );

        console.log("");

        console.log(
            "Server is READY"
        );

        console.log(
            "======================================"
        );
    }
);