const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);

const PORT =
    process.env.PORT || 3000;


app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// =========================
// LOAD QUIZ BANK
// =========================

const quizFile =
    path.join(
        __dirname,
        "data",
        "quiz.json"
    );

let questionBank = [];

try {

    questionBank =
        JSON.parse(
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


// =========================
// SETTINGS
// =========================

const rooms = {};

const DISCONNECT_GRACE_PERIOD =
    30000;

const DEFAULT_QUESTIONS_PER_GAME =
    10;

const QUESTION_TIME =
    15;

const GAME_READY_TIMEOUT =
    10000;


// =========================
// HELPERS
// =========================

function shuffle(array) {

    const copy =
        [...array];

    for (
        let i =
            copy.length - 1;

        i > 0;

        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            copy[i],
            copy[j]
        ] = [
            copy[j],
            copy[i]
        ];
    }

    return copy;
}


function generateRoomCode() {

    let roomCode;

    do {

        roomCode =
            Math.random()
                .toString(36)
                .substring(
                    2,
                    8
                )
                .toUpperCase();

    } while (
        rooms[roomCode]
    );

    return roomCode;
}


function findPlayer(
    room,
    playerId
) {

    if (!room) {
        return null;
    }

    return room.players.find(
        player =>
            player.playerId ===
            playerId
    );
}


// =========================
// QUESTION ENGINE
// =========================

function createQuestionSet(
    settings
) {

    const category =
        settings?.category ||
        "random";

    const difficulty =
        settings?.difficulty ||
        "mixed";

    let count =
        Number(
            settings?.questionCount
        ) ||
        DEFAULT_QUESTIONS_PER_GAME;


    count =
        Math.max(
            5,
            Math.min(
                count,
                20
            )
        );


    let available =
        [...questionBank];


    // CATEGORY

    if (
        category !==
        "random"
    ) {

        const categoryQuestions =
            available.filter(
                question =>
                    question.category ===
                    category
            );

        if (
            categoryQuestions.length >
            0
        ) {

            available =
                categoryQuestions;

        }

    }


    // DIFFICULTY

    if (
        difficulty !==
        "mixed"
    ) {

        const difficultyQuestions =
            available.filter(
                question =>
                    question.difficulty ===
                    difficulty
            );

        if (
            difficultyQuestions.length >
            0
        ) {

            available =
                difficultyQuestions;

        }

    }


    /*
        If the selected category/
        difficulty doesn't have enough
        questions, use the available
        questions from the selected
        category rather than crashing.
    */

    if (
        available.length <
        count
    ) {

        console.log(
            `Only ${available.length} questions available for selected settings.`
        );

    }


    return shuffle(
        available
    )
        .slice(
            0,
            Math.min(
                count,
                available.length
            )
        )
        .map(
            question => ({
                question:
                    question.question,

                answers:
                    question.answers,

                correct:
                    question.correct
            })
        );
}


// =========================
// ROOM UPDATE
// =========================

function sendRoomUpdate(
    roomCode
) {

    const room =
        rooms[roomCode];

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


// =========================
// SCORES
// =========================

function sendScores(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    const players =
        room.players
            .filter(
                player =>
                    player.connected
            )
            .map(
                player => ({

                    name:
                        player.name,

                    score:
                        player.score,

                    playerId:
                        player.playerId

                })
            );


    io.to(roomCode).emit(
        "scoreUpdate",
        players
    );
}


// =========================
// SEND QUESTION
// =========================

function sendQuestion(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    if (
        room.currentQuestionIndex >=
        room.questions.length
    ) {

        finishGame(
            roomCode
        );

        return;
    }


    const question =
        room.questions[
            room.currentQuestionIndex
        ];


    room.questionStartedAt =
        Date.now();


    room.answersThisRound =
        {};


    if (
        room.questionTimer
    ) {

        clearTimeout(
            room.questionTimer
        );

    }


    room.questionTimer =
        setTimeout(
            () => {

                nextQuestion(
                    roomCode
                );

            },

            QUESTION_TIME *
            1000
        );


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


// =========================
// NEXT QUESTION
// =========================

function nextQuestion(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    if (
        room.questionTimer
    ) {

        clearTimeout(
            room.questionTimer
        );

        room.questionTimer =
            null;

    }


    room.questionStartedAt =
        null;


    room.currentQuestionIndex++;


    sendScores(
        roomCode
    );


    setTimeout(
        () => {

            const currentRoom =
                rooms[roomCode];


            if (
                !currentRoom ||
                currentRoom.status !==
                    "playing"
            ) {

                return;
            }


            sendQuestion(
                roomCode
            );

        },

        1500
    );
}


// =========================
// FINISH GAME
// =========================

function finishGame(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    room.status =
        "finished";


    if (
        room.startTimer
    ) {

        clearTimeout(
            room.startTimer
        );

        room.startTimer =
            null;

    }


    if (
        room.questionTimer
    ) {

        clearTimeout(
            room.questionTimer
        );

        room.questionTimer =
            null;

    }


    room.questionStartedAt =
        null;


    const finalPlayers =
        room.players
            .map(
                player => ({

                    name:
                        player.name,

                    score:
                        player.score,

                    playerId:
                        player.playerId

                })
            )
            .sort(
                (a, b) =>
                    b.score -
                    a.score
            );


    io.to(roomCode).emit(
        "gameFinished",
        finalPlayers
    );
}


// =========================
// SOCKET.IO
// =========================

io.on(
    "connection",
    socket => {

        console.log(
            "Player connected:",
            socket.id
        );


        // =========================
        // CREATE ROOM
        // =========================

        socket.on(
            "createRoom",
            ({
                playerId,
                playerName,
                gameType,
                settings
            }) => {

                const roomCode =
                    generateRoomCode();


                rooms[roomCode] = {

                    hostPlayerId:
                        playerId,

                    gameType:
                        gameType,

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

                    questions:
                        [],

                    currentQuestionIndex:
                        0,

                    questionStartedAt:
                        null,

                    questionTimer:
                        null,

                    answersThisRound:
                        {},

                    readyPlayers:
                        new Set(),

                    startTimer:
                        null

                };


                socket.join(
                    roomCode
                );


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
                            gameType,

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


        // =========================
        // JOIN ROOM
        // =========================

        socket.on(
            "joinRoom",
            ({
                playerId,
                playerName,
                roomCode
            }) => {

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


                let player =
                    findPlayer(
                        room,
                        playerId
                    );


                if (player) {

                    player.socketId =
                        socket.id;

                    player.name =
                        playerName;

                    player.connected =
                        true;

                } else {

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


        // =========================
        // RECONNECT
        // =========================

        socket.on(
            "reconnectToRoom",
            ({
                roomCode,
                playerId
            }) => {

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


                sendRoomUpdate(
                    roomCode
                );


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
                                        ) /
                                        1000
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


        // =========================
        // START GAME
        // =========================

        socket.on(
            "startGame",
            ({
                roomCode,
                playerId
            }) => {

                const room =
                    rooms[roomCode];


                if (!room) {
                    return;
                }


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


                room.status =
                    "playing";


                room.questions =
                    createQuestionSet(
                        room.settings
                    );


                if (
                    room.questions.length ===
                    0
                ) {

                    room.status =
                        "lobby";


                    socket.emit(
                        "errorMessage",
                        "There are no questions available for this game."
                    );


                    return;
                }


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

                        player.score =
                            0;

                    }
                );


                io.to(roomCode).emit(
                    "gameStarted",
                    {

                        gameType:
                            room.gameType

                    }
                );


                room.startTimer =
                    setTimeout(
                        () => {

                            const currentRoom =
                                rooms[roomCode];


                            if (
                                !currentRoom
                            ) {
                                return;
                            }


                            if (
                                currentRoom.status !==
                                    "playing" ||
                                currentRoom.questionStartedAt
                            ) {

                                return;
                            }


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


        // =========================
        // GAME READY
        // =========================

        socket.on(
            "gameReady",
            ({
                roomCode,
                playerId
            }) => {

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
                                    ) /
                                    1000
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


                const connectedPlayers =
                    room.players.filter(
                        player =>
                            player.connected
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


        // =========================
        // SUBMIT ANSWER
        // =========================

        socket.on(
            "submitAnswer",
            ({
                roomCode,
                playerId,
                answerIndex
            }) => {

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


                if (
                    room.answersThisRound[
                        playerId
                    ]
                ) {

                    return;
                }


                room.answersThisRound[
                    playerId
                ] = true;


                const elapsed =
                    Date.now() -
                    room.questionStartedAt;


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


                const connectedPlayers =
                    room.players.filter(
                        player =>
                            player.connected
                    );


                const allAnswered =
                    connectedPlayers.length >
                        0 &&
                    connectedPlayers.every(
                        player =>
                            room.answersThisRound[
                                player.playerId
                            ]
                    );


                if (
                    allAnswered
                ) {

                    nextQuestion(
                        roomCode
                    );

                }

            }
        );


        // =========================
        // DISCONNECT
        // =========================

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


                if (
                    player.socketId ===
                    socket.id
                ) {

                    player.connected =
                        false;


                    sendRoomUpdate(
                        roomCode
                    );

                }


                setTimeout(
                    () => {

                        const currentRoom =
                            rooms[roomCode];


                        if (
                            !currentRoom
                        ) {

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


                        if (
                            currentPlayer.connected
                        ) {

                            return;
                        }


                        currentRoom.players =
                            currentRoom.players.filter(
                                player =>
                                    player.playerId !==
                                    playerId
                            );


                        currentRoom.readyPlayers.delete(
                            playerId
                        );


                        if (
                            currentRoom.hostPlayerId ===
                            playerId
                        ) {

                            const nextHost =
                                currentRoom.players.find(
                                    player =>
                                        player.connected
                                );


                            if (
                                nextHost
                            ) {

                                currentRoom.hostPlayerId =
                                    nextHost.playerId;

                            }

                        }


                        if (
                            currentRoom.players.length ===
                            0
                        ) {

                            if (
                                currentRoom.startTimer
                            ) {

                                clearTimeout(
                                    currentRoom.startTimer
                                );

                            }


                            if (
                                currentRoom.questionTimer
                            ) {

                                clearTimeout(
                                    currentRoom.questionTimer
                                );

                            }


                            delete rooms[
                                roomCode
                            ];


                            console.log(
                                `Room ${roomCode} deleted`
                            );


                            return;
                        }


                        sendRoomUpdate(
                            roomCode
                        );

                    },

                    DISCONNECT_GRACE_PERIOD
                );

            }
        );

    }
);


server.listen(
    PORT,
    () => {

        console.log(
            `Game Space server running on port ${PORT}`
        );

    }
);
