const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// ======================================================
// QUIZ BANK
// ======================================================

const quizFile = path.join(
    __dirname,
    "data",
    "quiz.json"
);

let questionBank = [];

try {
    questionBank = JSON.parse(
        fs.readFileSync(
            quizFile,
            "utf8"
        )
    );

    console.log(
        `Loaded ${questionBank.length} quiz questions.`
    );
} catch (error) {
    console.error(
        "Could not load quiz.json:",
        error
    );
}

// ======================================================
// SETTINGS
// ======================================================

const rooms = {};

const DISCONNECT_GRACE_PERIOD = 30000;

const DEFAULT_QUESTIONS_PER_GAME = 10;

const MIN_QUESTIONS = 5;

const MAX_QUESTIONS = 20;

const QUESTION_TIME = 15;

const GAME_READY_TIMEOUT = 10000;

const NEXT_QUESTION_DELAY = 1500;

// ======================================================
// HELPERS
// ======================================================

function shuffle(array) {
    const copy = [...array];

    for (
        let i = copy.length - 1;
        i > 0;
        i--
    ) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [copy[i], copy[j]] = [
            copy[j],
            copy[i]
        ];
    }

    return copy;
}

function generateRoomCode() {
    let roomCode;

    do {
        roomCode = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();
    } while (rooms[roomCode]);

    return roomCode;
}

function findPlayer(room, playerId) {
    if (!room) {
        return null;
    }

    return room.players.find(
        player =>
            player.playerId === playerId
    );
}

function getConnectedPlayers(room) {
    if (!room) {
        return [];
    }

    return room.players.filter(
        player => player.connected
    );
}

function clearRoomTimers(room) {
    if (!room) {
        return;
    }

    if (room.startTimer) {
        clearTimeout(room.startTimer);
        room.startTimer = null;
    }

    if (room.questionTimer) {
        clearTimeout(room.questionTimer);
        room.questionTimer = null;
    }

    if (room.nextQuestionTimer) {
        clearTimeout(room.nextQuestionTimer);
        room.nextQuestionTimer = null;
    }
}

function sortPlayersByScore(players) {
    return [...players].sort(
        (a, b) => b.score - a.score
    );
}

// ======================================================
// QUIZ QUESTION ENGINE
// ======================================================

function createQuestionSet(settings = {}) {

    const category =
        settings.category || "random";

    const difficulty =
        settings.difficulty || "mixed";


    let count =
        Number(settings.questionCount) ||
        DEFAULT_QUESTIONS_PER_GAME;


    // Keep question count within allowed limits
    count = Math.max(
        MIN_QUESTIONS,
        Math.min(
            count,
            MAX_QUESTIONS
        )
    );


    /*
    |---------------------------------------------------------------------------
    | START WITH ALL QUESTIONS
    |---------------------------------------------------------------------------
    */

    let categoryPool =
        [...questionBank];


    /*
    |---------------------------------------------------------------------------
    | CATEGORY FILTER
    |---------------------------------------------------------------------------
    */

    if (category !== "random") {

        const matchingCategory =
            categoryPool.filter(
                question =>
                    question.category ===
                    category
            );


        /*
        | If the category exists, use it.
        | If it doesn't, fall back to the
        | full question bank.
        */

        if (
            matchingCategory.length > 0
        ) {

            categoryPool =
                matchingCategory;

        }

    }


    /*
    |---------------------------------------------------------------------------
    | DIFFICULTY FILTER
    |---------------------------------------------------------------------------
    */

    if (difficulty === "mixed") {

        /*
        | Mixed difficulty:
        | simply shuffle the category pool.
        */

        categoryPool =
            shuffle(
                categoryPool
            );

    } else {

        /*
        |-----------------------------------------------------------------------
        | PREFERRED DIFFICULTY
        |-----------------------------------------------------------------------
        |
        | First, get questions matching the
        | requested difficulty.
        |
        */

        const preferredQuestions =
            categoryPool.filter(
                question =>
                    question.difficulty ===
                    difficulty
            );


        /*
        |-----------------------------------------------------------------------
        | OTHER DIFFICULTIES
        |-----------------------------------------------------------------------
        |
        | If there aren't enough questions at
        | the requested difficulty, we fill the
        | remaining slots with other questions
        | from the same category.
        |
        */

        const otherQuestions =
            categoryPool.filter(
                question =>
                    question.difficulty !==
                    difficulty
            );


        const shuffledPreferred =
            shuffle(
                preferredQuestions
            );


        const shuffledOthers =
            shuffle(
                otherQuestions
            );


        categoryPool = [
            ...shuffledPreferred,
            ...shuffledOthers
        ];

    }


    /*
    |---------------------------------------------------------------------------
    | MAKE SURE WE HAVE QUESTIONS
    |---------------------------------------------------------------------------
    */

    if (
        categoryPool.length === 0
    ) {

        console.log(
            "No questions available for selected settings."
        );

        return [];

    }


    /*
    |---------------------------------------------------------------------------
    | SELECT QUESTIONS
    |---------------------------------------------------------------------------
    */

    const selectedQuestions =
        categoryPool.slice(
            0,
            Math.min(
                count,
                categoryPool.length
            )
        );


    /*
    |---------------------------------------------------------------------------
    | LOG GAME GENERATION
    |---------------------------------------------------------------------------
    */

    console.log(
        `Generated ${selectedQuestions.length} questions | Category: ${category} | Difficulty: ${difficulty}`
    );


    /*
    |---------------------------------------------------------------------------
    | RETURN CLEAN QUESTION OBJECTS
    |---------------------------------------------------------------------------
    |
    | We deliberately do NOT send the correct
    | answer to the client.
    |
    */

    return selectedQuestions.map(
        question => ({

            question:
                question.question,

            answers:
                [...question.answers],

            correct:
                question.correct

        })
    );

}

    let available = [...questionBank];

    // ------------------------------------------
    // CATEGORY
    // ------------------------------------------

    if (category !== "random") {
        const categoryQuestions =
            available.filter(
                question =>
                    question.category ===
                    category
            );

        if (
            categoryQuestions.length > 0
        ) {
            available =
                categoryQuestions;
        }
    }

    // ------------------------------------------
    // DIFFICULTY
    // ------------------------------------------

    if (difficulty !== "mixed") {
        const difficultyQuestions =
            available.filter(
                question =>
                    question.difficulty ===
                    difficulty
            );

        if (
            difficultyQuestions.length > 0
        ) {
            available =
                difficultyQuestions;
        }
    }

    if (available.length === 0) {
        return [];
    }

    if (available.length < count) {
        console.log(
            `Only ${available.length} questions available for selected settings.`
        );
    }

    return shuffle(available)
        .slice(
            0,
            Math.min(
                count,
                available.length
            )
        )
        .map(question => ({
            question:
                question.question,

            answers:
                question.answers,

            correct:
                question.correct
        }));
}

// ======================================================
// ROOM UPDATE
// ======================================================

function sendRoomUpdate(roomCode) {
    const room = rooms[roomCode];

    if (!room) {
        return;
    }

    io.to(roomCode).emit(
        "roomUpdate",
        {
            hostPlayerId:
                room.hostPlayerId,

            gameType:
                room.gameType,

            status:
                room.status,

            settings:
                room.settings,

            players:
                room.players.filter(
                    player =>
                        player.connected
                )
        }
    );
}

// ======================================================
// SCORE UPDATE
// ======================================================

function sendScores(roomCode) {
    const room = rooms[roomCode];

    if (!room) {
        return;
    }

    const players =
        getConnectedPlayers(room)
            .map(player => ({
                name:
                    player.name,

                score:
                    player.score,

                playerId:
                    player.playerId
            }))
            .sort(
                (a, b) =>
                    b.score - a.score
            );

    io.to(roomCode).emit(
        "scoreUpdate",
        players
    );
}

// ======================================================
// SEND CURRENT QUESTION
// ======================================================

function sendQuestion(roomCode) {
    const room = rooms[roomCode];

    if (!room) {
        return;
    }

    if (
        room.currentQuestionIndex >=
        room.questions.length
    ) {
        finishGame(roomCode);
        return;
    }

    const question =
        room.questions[
            room.currentQuestionIndex
        ];

    if (!question) {
        finishGame(roomCode);
        return;
    }

    room.questionStartedAt =
        Date.now();

    room.answersThisRound = {};

    if (room.questionTimer) {
        clearTimeout(
            room.questionTimer
        );
    }

    room.questionTimer =
        setTimeout(() => {
            nextQuestion(roomCode);
        }, QUESTION_TIME * 1000);

    io.to(roomCode).emit(
        "newQuestion",
        {
            number:
                room.currentQuestionIndex +
                1,

            total:
                room.questions.length,

            question:
                question.question,

            answers:
                question.answers,

            timeLimit:
                QUESTION_TIME
        }
    );
}

// ======================================================
// NEXT QUESTION
// ======================================================

function nextQuestion(roomCode) {
    const room = rooms[roomCode];

    if (!room) {
        return;
    }

    if (room.status !== "playing") {
        return;
    }

    if (room.questionTimer) {
        clearTimeout(
            room.questionTimer
        );

        room.questionTimer = null;
    }

    room.questionStartedAt = null;

    room.currentQuestionIndex++;

    sendScores(roomCode);

    if (room.nextQuestionTimer) {
        clearTimeout(
            room.nextQuestionTimer
        );
    }

    room.nextQuestionTimer =
        setTimeout(() => {
            const currentRoom =
                rooms[roomCode];

            if (!currentRoom) {
                return;
            }

            if (
                currentRoom.status !==
                "playing"
            ) {
                return;
            }

            currentRoom.nextQuestionTimer =
                null;

            sendQuestion(roomCode);
        }, NEXT_QUESTION_DELAY);
}

// ======================================================
// FINISH GAME
// ======================================================

function finishGame(roomCode) {
    const room = rooms[roomCode];

    if (!room) {
        return;
    }

    if (room.status === "finished") {
        return;
    }

    room.status = "finished";

    clearRoomTimers(room);

    room.questionStartedAt = null;

    const finalPlayers =
        sortPlayersByScore(
            room.players
        ).map(player => ({
            name:
                player.name,

            score:
                player.score,

            playerId:
                player.playerId
        }));

    io.to(roomCode).emit(
        "gameFinished",
        finalPlayers
    );

    sendRoomUpdate(roomCode);

    console.log(
        `Game finished in room ${roomCode}`
    );
}

// ======================================================
// RESET ROOM FOR REMATCH
// ======================================================

function resetRoomForRematch(room) {
    clearRoomTimers(room);

    room.status = "lobby";

    room.questions = [];

    room.currentQuestionIndex = 0;

    room.questionStartedAt = null;

    room.answersThisRound = {};

    room.readyPlayers = new Set();

    room.players.forEach(player => {
        player.score = 0;
        player.connected =
            Boolean(player.connected);
    });
}

// ======================================================
// REMOVE PLAYER
// ======================================================

function removePlayer(
    roomCode,
    playerId
) {
    const room = rooms[roomCode];

    if (!room) {
        return;
    }

    const player =
        findPlayer(
            room,
            playerId
        );

    if (!player) {
        return;
    }

    room.players =
        room.players.filter(
            currentPlayer =>
                currentPlayer.playerId !==
                playerId
        );

    room.readyPlayers.delete(
        playerId
    );

    // ------------------------------------------
    // HOST TRANSFER
    // ------------------------------------------

    if (
        room.hostPlayerId ===
        playerId
    ) {
        const nextHost =
            room.players.find(
                currentPlayer =>
                    currentPlayer.connected
            );

        if (nextHost) {
            room.hostPlayerId =
                nextHost.playerId;

            io.to(roomCode).emit(
                "hostChanged",
                {
                    hostPlayerId:
                        nextHost.playerId,

                    message:
                        `${nextHost.name} is now the host.`
                }
            );
        }
    }

    // ------------------------------------------
    // DELETE EMPTY ROOM
    // ------------------------------------------

    if (
        room.players.length === 0
    ) {
        clearRoomTimers(room);

        delete rooms[roomCode];

        console.log(
            `Room ${roomCode} deleted because it is empty.`
        );

        return;
    }

    sendRoomUpdate(roomCode);
}

// ======================================================
// SOCKET.IO
// ======================================================

io.on(
    "connection",
    socket => {

        console.log(
            "Player connected:",
            socket.id
        );

        // ==================================================
        // CREATE ROOM
        // ==================================================

        socket.on(
            "createRoom",
            ({
                playerId,
                playerName,
                gameType,
                settings
            } = {}) => {

                if (
                    !playerId ||
                    !playerName
                ) {
                    socket.emit(
                        "errorMessage",
                        "Player information is missing."
                    );

                    return;
                }

                const roomCode =
                    generateRoomCode();

                rooms[roomCode] = {

                    // Creator is ALWAYS host.
                    hostPlayerId:
                        playerId,

                    gameType:
                        gameType ||
                        "quiz",

                    settings:
                        settings || {},

                    status:
                        "lobby",

                    players: [
                        {
                            playerId:
                                playerId,

                            socketId:
                                socket.id,

                            name:
                                playerName,

                            score:
                                0,

                            connected:
                                true
                        }
                    ],

                    questions: [],

                    currentQuestionIndex:
                        0,

                    questionStartedAt:
                        null,

                    questionTimer:
                        null,

                    nextQuestionTimer:
                        null,

                    answersThisRound:
                        {},

                    readyPlayers:
                        new Set(),

                    startTimer:
                        null
                };

                socket.join(roomCode);

                socket.roomCode =
                    roomCode;

                socket.playerId =
                    playerId;

                socket.emit(
                    "roomCreated",
                    {
                        roomCode:
                            roomCode,

                        gameType:
                            gameType ||
                            "quiz",

                        playerId:
                            playerId
                    }
                );

                sendRoomUpdate(
                    roomCode
                );

                console.log(
                    `Room ${roomCode} created by ${playerName}`
                );
            }
        );

        // ==================================================
        // JOIN ROOM
        // ==================================================

        socket.on(
            "joinRoom",
            ({
                playerId,
                playerName,
                roomCode
            } = {}) => {

                roomCode =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();

                const room =
                    rooms[roomCode];

                if (!room) {
                    socket.emit(
                        "errorMessage",
                        "Room not found."
                    );

                    return;
                }

                if (
                    room.status !==
                    "lobby"
                ) {
                    socket.emit(
                        "errorMessage",
                        "This game has already started."
                    );

                    return;
                }

                if (
                    !playerId ||
                    !playerName
                ) {
                    socket.emit(
                        "errorMessage",
                        "Player information is missing."
                    );

                    return;
                }

                let player =
                    findPlayer(
                        room,
                        playerId
                    );

                // ------------------------------------------
                // REJOIN EXISTING PLAYER
                // ------------------------------------------

                if (player) {

                    player.socketId =
                        socket.id;

                    player.name =
                        playerName;

                    player.connected =
                        true;

                } else {

                    // ------------------------------------------
                    // NEW PLAYER
                    // ------------------------------------------

                    player = {

                        playerId:
                            playerId,

                        socketId:
                            socket.id,

                        name:
                            playerName,

                        score:
                            0,

                        connected:
                            true
                    };

                    room.players.push(
                        player
                    );
                }

                socket.join(
                    roomCode
                );

                socket.roomCode =
                    roomCode;

                socket.playerId =
                    playerId;

                socket.emit(
                    "joinedRoom",
                    {
                        roomCode:
                            roomCode,

                        gameType:
                            room.gameType,

                        playerId:
                            playerId
                    }
                );

                sendRoomUpdate(
                    roomCode
                );

                console.log(
                    `${playerName} joined room ${roomCode}`
                );
            }
        );

        // ==================================================
        // RECONNECT
        // ==================================================

        socket.on(
            "reconnectToRoom",
            ({
                roomCode,
                playerId
            } = {}) => {

                roomCode =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();

                const room =
                    rooms[roomCode];

                if (!room) {
                    socket.emit(
                        "errorMessage",
                        "Room no longer exists."
                    );

                    return;
                }

                const player =
                    findPlayer(
                        room,
                        playerId
                    );

                if (!player) {
                    socket.emit(
                        "errorMessage",
                        "Player not found in this room."
                    );

                    return;
                }

                player.socketId =
                    socket.id;

                player.connected =
                    true;

                socket.join(
                    roomCode
                );

                socket.roomCode =
                    roomCode;

                socket.playerId =
                    playerId;

                socket.emit(
                    "reconnected",
                    {
                        roomCode:
                            roomCode,

                        gameType:
                            room.gameType,

                        playerId:
                            playerId,

                        status:
                            room.status
                    }
                );

                sendRoomUpdate(
                    roomCode
                );

                // ------------------------------------------
                // IF GAME IS PLAYING
                // ------------------------------------------

                if (
                    room.status ===
                    "playing"
                ) {

                    sendScores(
                        roomCode
                    );

                    if (
                        room.questionStartedAt
                    ) {

                        const question =
                            room.questions[
                                room.currentQuestionIndex
                            ];

                        if (question) {

                            const elapsed =
                                Date.now() -
                                room.questionStartedAt;

                            const remaining =
                                Math.max(
                                    0,
                                    Math.ceil(
                                        (
                                            QUESTION_TIME *
                                            1000 -
                                            elapsed
                                        ) / 1000
                                    )
                                );

                            if (
                                remaining >
                                0
                            ) {

                                socket.emit(
                                    "newQuestion",
                                    {
                                        number:
                                            room.currentQuestionIndex +
                                            1,

                                        total:
                                            room.questions.length,

                                        question:
                                            question.question,

                                        answers:
                                            question.answers,

                                        timeLimit:
                                            remaining
                                    }
                                );

                            }
                        }
                    }
                }
            }
        );

        // ==================================================
        // START GAME
        // ==================================================

        socket.on(
            "startGame",
            ({
                roomCode,
                playerId
            } = {}) => {

                roomCode =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();

                const room =
                    rooms[roomCode];

                if (!room) {
                    socket.emit(
                        "errorMessage",
                        "Room not found."
                    );

                    return;
                }

                // ------------------------------------------
                // HOST CHECK
                // ------------------------------------------

                if (
                    room.hostPlayerId !==
                    playerId
                ) {
                    socket.emit(
                        "errorMessage",
                        "Only the host can start the game."
                    );

                    return;
                }

                if (
                    room.status !==
                    "lobby"
                ) {
                    return;
                }

                // ------------------------------------------
                // CURRENTLY QUIZ
                // ------------------------------------------

                if (
                    room.gameType ===
                    "quiz"
                ) {

                    room.questions =
                        createQuestionSet(
                            room.settings
                        );

                    if (
                        room.questions.length ===
                        0
                    ) {

                        socket.emit(
                            "errorMessage",
                            "There are no questions available for this game."
                        );

                        return;
                    }

                } else {

                    // The shared room engine is ready
                    // for the next game modules.
                    socket.emit(
                        "errorMessage",
                        "This game is not available yet."
                    );

                    return;
                }

                // ------------------------------------------
                // RESET GAME STATE
                // ------------------------------------------

                room.status =
                    "playing";

                room.currentQuestionIndex =
                    0;

                room.answersThisRound =
                    {};

                room.questionStartedAt =
                    null;

                room.readyPlayers =
                    new Set();

                room.players.forEach(
                    player => {
                        player.score = 0;
                    }
                );

                io.to(roomCode).emit(
                    "gameStarted",
                    {
                        gameType:
                            room.gameType
                    }
                );

                // ------------------------------------------
                // WAIT FOR CLIENTS TO LOAD
                // ------------------------------------------

                room.startTimer =
                    setTimeout(
                        () => {

                            const currentRoom =
                                rooms[roomCode];

                            if (!currentRoom) {
                                return;
                            }

                            if (
                                currentRoom.status !==
                                "playing"
                            ) {
                                return;
                            }

                            if (
                                currentRoom.questionStartedAt
                            ) {
                                return;
                            }

                            currentRoom.startTimer =
                                null;

                            console.log(
                                `Starting ${roomCode} after ready timeout`
                            );

                            sendQuestion(
                                roomCode
                            );

                            sendScores(
                                roomCode
                            );

                        },
                        GAME_READY_TIMEOUT
                    );
            }
        );

        // ==================================================
        // GAME READY
        // ==================================================

        socket.on(
            "gameReady",
            ({
                roomCode,
                playerId
            } = {}) => {

                roomCode =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();

                const room =
                    rooms[roomCode];

                if (
                    !room ||
                    room.status !==
                    "playing"
                ) {
                    return;
                }

                const player =
                    findPlayer(
                        room,
                        playerId
                    );

                if (!player) {
                    return;
                }

                player.socketId =
                    socket.id;

                player.connected =
                    true;

                socket.join(
                    roomCode
                );

                socket.roomCode =
                    roomCode;

                socket.playerId =
                    playerId;

                room.readyPlayers.add(
                    playerId
                );

                socket.emit(
                    "gameReadyConfirmed"
                );

                sendScores(
                    roomCode
                );

                // ------------------------------------------
                // PLAYER RECONNECTED DURING QUESTION
                // ------------------------------------------

                if (
                    room.questionStartedAt
                ) {

                    const question =
                        room.questions[
                            room.currentQuestionIndex
                        ];

                    if (question) {

                        const elapsed =
                            Date.now() -
                            room.questionStartedAt;

                        const remaining =
                            Math.max(
                                0,
                                Math.ceil(
                                    (
                                        QUESTION_TIME *
                                        1000 -
                                        elapsed
                                    ) / 1000
                                )
                            );

                        if (
                            remaining >
                            0
                        ) {

                            socket.emit(
                                "newQuestion",
                                {
                                    number:
                                        room.currentQuestionIndex +
                                        1,

                                    total:
                                        room.questions.length,

                                    question:
                                        question.question,

                                    answers:
                                        question.answers,

                                    timeLimit:
                                        remaining
                                }
                            );
                        }
                    }

                    return;
                }

                // ------------------------------------------
                // CHECK IF EVERYONE IS READY
                // ------------------------------------------

                const connectedPlayers =
                    getConnectedPlayers(
                        room
                    );

                const allReady =
                    connectedPlayers.length >
                        0 &&
                    connectedPlayers.every(
                        player =>
                            room.readyPlayers.has(
                                player.playerId
                            )
                    );

                if (
                    allReady &&
                    !room.questionStartedAt
                ) {

                    if (
                        room.startTimer
                    ) {

                        clearTimeout(
                            room.startTimer
                        );

                        room.startTimer =
                            null;
                    }

                    console.log(
                        `All players ready in ${roomCode}`
                    );

                    sendQuestion(
                        roomCode
                    );

                    sendScores(
                        roomCode
                    );
                }
            }
        );

        // ==================================================
        // SUBMIT ANSWER
        // ==================================================

        socket.on(
            "submitAnswer",
            ({
                roomCode,
                playerId,
                answerIndex
            } = {}) => {

                roomCode =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();

                const room =
                    rooms[roomCode];

                if (
                    !room ||
                    room.status !==
                    "playing"
                ) {
                    return;
                }

                const player =
                    findPlayer(
                        room,
                        playerId
                    );

                if (!player) {
                    return;
                }

                const question =
                    room.questions[
                        room.currentQuestionIndex
                    ];

                if (!question) {
                    return;
                }

                // ------------------------------------------
                // PREVENT DOUBLE ANSWERS
                // ------------------------------------------

                if (
                    room.answersThisRound[
                        playerId
                    ]
                ) {
                    return;
                }

                // ------------------------------------------
                // PREVENT ANSWERS AFTER TIMER
                // ------------------------------------------

                if (
                    !room.questionStartedAt
                ) {
                    return;
                }

                const elapsed =
                    Date.now() -
                    room.questionStartedAt;

                if (
                    elapsed >
                    QUESTION_TIME * 1000
                ) {
                    return;
                }

                room.answersThisRound[
                    playerId
                ] = true;

                const timeRemaining =
                    Math.max(
                        0,
                        QUESTION_TIME *
                            1000 -
                            elapsed
                    );

                const correct =
                    Number(
                        answerIndex
                    ) ===
                    question.correct;

                let points = 0;

                if (correct) {

                    points =
                        500 +
                        Math.round(
                            500 *
                            (
                                timeRemaining /
                                (
                                    QUESTION_TIME *
                                    1000
                                )
                            )
                        );

                    player.score +=
                        points;
                }

                socket.emit(
                    "answerResult",
                    {
                        correct:
                            correct,

                        points:
                            points
                    }
                );

                sendScores(
                    roomCode
                );

                // ------------------------------------------
                // MOVE ON WHEN EVERYONE ANSWERS
                // ------------------------------------------

                const connectedPlayers =
                    getConnectedPlayers(
                        room
                    );

                const allAnswered =
                    connectedPlayers.length >
                        0 &&
                    connectedPlayers.every(
                        currentPlayer =>
                            room.answersThisRound[
                                currentPlayer.playerId
                            ]
                    );

                if (allAnswered) {
                    nextQuestion(
                        roomCode
                    );
                }
            }
        );

        // ==================================================
        // LEAVE ROOM
        // ==================================================

        socket.on(
            "leaveRoom",
            ({
                roomCode,
                playerId
            } = {}) => {

                roomCode =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();

                const room =
                    rooms[roomCode];

                if (!room) {
                    return;
                }

                const player =
                    findPlayer(
                        room,
                        playerId
                    );

                if (!player) {
                    return;
                }

                console.log(
                    `${player.name} left room ${roomCode}`
                );

                removePlayer(
                    roomCode,
                    playerId
                );

                socket.leave(
                    roomCode
                );

                socket.roomCode =
                    null;

                socket.playerId =
                    null;
            }
        );

        // ==================================================
        // REMATCH
        // ==================================================

        socket.on(
            "rematch",
            ({
                roomCode,
                playerId
            } = {}) => {

                roomCode =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();

                const room =
                    rooms[roomCode];

                if (!room) {
                    socket.emit(
                        "errorMessage",
                        "Room not found."
                    );

                    return;
                }

                if (
                    room.hostPlayerId !==
                    playerId
                ) {
                    socket.emit(
                        "errorMessage",
                        "Only the host can start a rematch."
                    );

                    return;
                }

                if (
                    room.status !==
                    "finished"
                ) {
                    return;
                }

                resetRoomForRematch(
                    room
                );

                io.to(roomCode).emit(
                    "rematchStarted"
                );

                sendRoomUpdate(
                    roomCode
                );

                console.log(
                    `Rematch opened in room ${roomCode}`
                );
            }
        );

        // ==================================================
        // DISCONNECT
        // ==================================================

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Player disconnected:",
                    socket.id
                );

                const roomCode =
                    socket.roomCode;

                const playerId =
                    socket.playerId;

                if (
                    !roomCode ||
                    !playerId
                ) {
                    return;
                }

                const room =
                    rooms[roomCode];

                if (!room) {
                    return;
                }

                const player =
                    findPlayer(
                        room,
                        playerId
                    );

                if (!player) {
                    return;
                }

                // Make sure an old socket
                // cannot disconnect a newer
                // connection for the same player.

                if (
                    player.socketId !==
                    socket.id
                ) {
                    return;
                }

                player.connected =
                    false;

                sendRoomUpdate(
                    roomCode
                );

                // ------------------------------------------
                // GRACE PERIOD
                // ------------------------------------------

                setTimeout(
                    () => {

                        const currentRoom =
                            rooms[roomCode];

                        if (!currentRoom) {
                            return;
                        }

                        const currentPlayer =
                            findPlayer(
                                currentRoom,
                                playerId
                            );

                        if (
                            !currentPlayer
                        ) {
                            return;
                        }

                        // Player reconnected.
                        if (
                            currentPlayer.connected
                        ) {
                            return;
                        }

                        removePlayer(
                            roomCode,
                            playerId
                        );

                    },
                    DISCONNECT_GRACE_PERIOD
                );
            }
        );
    }
);

// ======================================================
// SERVER
// ======================================================

server.listen(
    PORT,
    () => {
        console.log(
            `Game Space server running on port ${PORT}`
        );
    }
);
