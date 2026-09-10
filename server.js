const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);

const PORT =
    process.env.PORT || 3000;


// =========================
// EXPRESS
// =========================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


// =========================
// GAME SETTINGS
// =========================

const rooms = {};

const DISCONNECT_GRACE_PERIOD =
    30000;

const QUESTIONS_PER_GAME =
    10;

const QUESTION_TIME =
    15;

const GAME_READY_TIMEOUT =
    10000;


// =========================
// QUESTION BANK
// =========================

const questionBank = [

    {
        question:
            "Which country is the most populous in Africa?",
        answers: [
            "Nigeria",
            "Egypt",
            "South Africa",
            "Ethiopia"
        ],
        correct: 0
    },

    {
        question:
            "What is the capital city of Ghana?",
        answers: [
            "Kumasi",
            "Accra",
            "Lagos",
            "Tamale"
        ],
        correct: 1
    },

    {
        question:
            "Which planet is known as the Red Planet?",
        answers: [
            "Venus",
            "Jupiter",
            "Mars",
            "Saturn"
        ],
        correct: 2
    },

    {
        question:
            "How many continents are there?",
        answers: [
            "5",
            "6",
            "7",
            "8"
        ],
        correct: 2
    },

    {
        question:
            "Which ocean is the largest?",
        answers: [
            "Atlantic Ocean",
            "Indian Ocean",
            "Pacific Ocean",
            "Arctic Ocean"
        ],
        correct: 2
    },

    {
        question:
            "What is the currency of Kenya?",
        answers: [
            "Naira",
            "Cedi",
            "Kenyan Shilling",
            "Rand"
        ],
        correct: 2
    },

    {
        question:
            "Which African country is famous for the ancient pyramids of Giza?",
        answers: [
            "Egypt",
            "Morocco",
            "Sudan",
            "Tunisia"
        ],
        correct: 0
    },

    {
        question:
            "What gas do humans need to breathe?",
        answers: [
            "Carbon dioxide",
            "Oxygen",
            "Hydrogen",
            "Nitrogen"
        ],
        correct: 1
    },

    {
        question:
            "Which animal is known as the king of the jungle?",
        answers: [
            "Tiger",
            "Elephant",
            "Lion",
            "Leopard"
        ],
        correct: 2
    },

    {
        question:
            "Which Nigerian city is known as the country's largest commercial city?",
        answers: [
            "Ibadan",
            "Abuja",
            "Lagos",
            "Enugu"
        ],
        correct: 2
    },

    {
        question:
            "Which instrument has black and white keys?",
        answers: [
            "Guitar",
            "Piano",
            "Drum",
            "Trumpet"
        ],
        correct: 1
    },

    {
        question:
            "What is 12 × 5?",
        answers: [
            "50",
            "55",
            "60",
            "65"
        ],
        correct: 2
    },

    {
        question:
            "Which country is famous for the Maasai people?",
        answers: [
            "Kenya",
            "Nigeria",
            "Ghana",
            "Senegal"
        ],
        correct: 0
    },

    {
        question:
            "Which is the largest land animal?",
        answers: [
            "Giraffe",
            "Elephant",
            "Rhinoceros",
            "Hippopotamus"
        ],
        correct: 1
    },

    {
        question:
            "What is the capital of Nigeria?",
        answers: [
            "Lagos",
            "Kano",
            "Abuja",
            "Ibadan"
        ],
        correct: 2
    },

    {
        question:
            "Which language is primarily spoken in Brazil?",
        answers: [
            "Spanish",
            "Portuguese",
            "French",
            "English"
        ],
        correct: 1
    },

    {
        question:
            "How many sides does a triangle have?",
        answers: [
            "2",
            "3",
            "4",
            "5"
        ],
        correct: 1
    },

    {
        question:
            "Which Nigerian food is traditionally made from cassava?",
        answers: [
            "Jollof rice",
            "Garri",
            "Moi moi",
            "Suya"
        ],
        correct: 1
    },

    {
        question:
            "Which organ pumps blood around the human body?",
        answers: [
            "Lungs",
            "Brain",
            "Heart",
            "Kidney"
        ],
        correct: 2
    },

    {
        question:
            "Which desert is the largest hot desert in the world?",
        answers: [
            "Kalahari",
            "Sahara",
            "Namib",
            "Gobi"
        ],
        correct: 1
    },

    {
        question:
            "Which Nigerian musician is known for the song 'Ye'?",
        answers: [
            "Wizkid",
            "Burna Boy",
            "Davido",
            "Olamide"
        ],
        correct: 1
    },

    {
        question:
            "What is the boiling point of water at sea level?",
        answers: [
            "50°C",
            "75°C",
            "100°C",
            "150°C"
        ],
        correct: 2
    },

    {
        question:
            "Which country gifted the Statue of Liberty to the United States?",
        answers: [
            "France",
            "Spain",
            "Italy",
            "Germany"
        ],
        correct: 0
    },

    {
        question:
            "Which sport uses a racket and a shuttlecock?",
        answers: [
            "Tennis",
            "Badminton",
            "Squash",
            "Cricket"
        ],
        correct: 1
    }

];


// =========================
// RANDOM FUNCTIONS
// =========================

function shuffle(array) {

    const copy =
        [...array];

    for (
        let i = copy.length - 1;
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


function createQuestionSet() {

    return shuffle(
        questionBank
    ).slice(
        0,
        Math.min(
            QUESTIONS_PER_GAME,
            questionBank.length
        )
    );
}


// =========================
// ROOM CODE
// =========================

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


// =========================
// FIND PLAYER
// =========================

function findPlayer(
    room,
    playerId
) {

    if (!room) {
        return null;
    }

    return room.players.find(
        (player) =>
            player.playerId ===
            playerId
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

            players:
                room.players.filter(
                    (player) =>
                        player.connected
                )
        }
    );
}


// =========================
// SEND SCORES
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
                (player) =>
                    player.connected
            )
            .map(
                (player) => ({
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
            QUESTION_TIME * 1000
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
                (player) => ({
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
// SOCKET CONNECTION
// =========================

io.on(
    "connection",
    (socket) => {

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
                gameType
            }) => {

                const roomCode =
                    generateRoomCode();

                rooms[roomCode] = {

                    hostPlayerId:
                        playerId,

                    gameType:
                        gameType,

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

                }

                else {

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
        // RECONNECT TO ROOM
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
                                        ) / 1000
                                    )
                                );

                            if (
                                remaining > 0
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
                    createQuestionSet();

                room.currentQuestionIndex =
                    0;

                room.answersThisRound =
                    {};

                room.questionStartedAt =
                    null;

                room.readyPlayers =
                    new Set();

                room.players.forEach(
                    (player) => {

                        player.score =
                            0;

                    }
                );

                // Tell everyone to open game.html
                io.to(roomCode).emit(
                    "gameStarted",
                    {
                        gameType:
                            room.gameType
                    }
                );

                // Safety fallback.
                // If everyone does not signal ready,
                // start after 10 seconds.
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
        // GAME PAGE READY
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

                // Update this player's socket
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

                // Tell this player that
                // the server received the signal.
                socket.emit(
                    "gameReadyConfirmed"
                );

                // Send current scores
                sendScores(
                    roomCode
                );


                // =========================
                // GAME ALREADY STARTED
                // =========================

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
                            remaining > 0
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


                // =========================
                // CHECK ALL PLAYERS
                // =========================

                const connectedPlayers =
                    room.players.filter(
                        (player) =>
                            player.connected
                    );

                const allReady =
                    connectedPlayers.length >
                        0 &&
                    connectedPlayers.every(
                        (player) =>
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

                // Prevent duplicate answers
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


                // =========================
                // CALCULATE TIME
                // =========================

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


                // =========================
                // CHECK ANSWER
                // =========================

                const correct =
                    Number(
                        answerIndex
                    ) ===
                    question.correct;


                let points =
                    0;


                if (correct) {

                    // Base: 500
                    // Maximum: 1000
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


                // Tell only this player
                // whether their answer was correct.
                socket.emit(
                    "answerResult",
                    {

                        correct:
                            correct,

                        points:
                            points

                    }
                );


                // Update everyone
                sendScores(
                    roomCode
                );


                // =========================
                // CHECK IF EVERYONE ANSWERED
                // =========================

                const connectedPlayers =
                    room.players.filter(
                        (player) =>
                            player.connected
                    );

                const allAnswered =
                    connectedPlayers.length >
                        0 &&
                    connectedPlayers.every(
                        (player) =>
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

                // Only mark disconnected if
                // this is still their active socket.
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


                // =========================
                // GRACE PERIOD
                // =========================

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

                        // Player has reconnected
                        if (
                            currentPlayer.connected
                        ) {

                            return;
                        }

                        // Remove disconnected player
                        currentRoom.players =
                            currentRoom.players.filter(
                                (p) =>
                                    p.playerId !==
                                    playerId
                            );

                        currentRoom.readyPlayers.delete(
                            playerId
                        );

                        // If the host leaves,
                        // assign a new host.
                        if (
                            currentRoom.hostPlayerId ===
                            playerId
                        ) {

                            const nextHost =
                                currentRoom.players.find(
                                    (p) =>
                                        p.connected
                                );

                            if (
                                nextHost
                            ) {

                                currentRoom.hostPlayerId =
                                    nextHost.playerId;

                            }
                        }

                        // If nobody remains,
                        // remove the room.
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


// =========================
// START SERVER
// =========================

server.listen(
    PORT,
    () => {

        console.log(
            `Game Space server running on port ${PORT}`
        );

    }
);
