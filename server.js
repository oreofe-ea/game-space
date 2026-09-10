const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));


// ==================================================
// GAME ROOMS
// ==================================================

const rooms = {};

const DISCONNECT_GRACE_PERIOD = 30000;

const QUESTIONS_PER_GAME = 10;

const QUESTION_TIME = 15;


// ==================================================
// QUESTION BANK
// ==================================================

const questionBank = [

    {
        question: "Which country is the most populous in Africa?",
        answers: [
            "Nigeria",
            "Egypt",
            "South Africa",
            "Ethiopia"
        ],
        correct: 0
    },

    {
        question: "What is the capital city of Ghana?",
        answers: [
            "Kumasi",
            "Accra",
            "Lagos",
            "Tamale"
        ],
        correct: 1
    },

    {
        question: "Which planet is known as the Red Planet?",
        answers: [
            "Venus",
            "Jupiter",
            "Mars",
            "Saturn"
        ],
        correct: 2
    },

    {
        question: "How many continents are there?",
        answers: [
            "5",
            "6",
            "7",
            "8"
        ],
        correct: 2
    },

    {
        question: "Which ocean is the largest?",
        answers: [
            "Atlantic Ocean",
            "Indian Ocean",
            "Pacific Ocean",
            "Arctic Ocean"
        ],
        correct: 2
    },

    {
        question: "What is the currency of Kenya?",
        answers: [
            "Naira",
            "Cedi",
            "Kenyan Shilling",
            "Rand"
        ],
        correct: 2
    },

    {
        question: "Which African country is famous for the ancient pyramids of Giza?",
        answers: [
            "Egypt",
            "Morocco",
            "Sudan",
            "Tunisia"
        ],
        correct: 0
    },

    {
        question: "What gas do humans need to breathe?",
        answers: [
            "Carbon dioxide",
            "Oxygen",
            "Hydrogen",
            "Nitrogen"
        ],
        correct: 1
    },

    {
        question: "Which animal is known as the king of the jungle?",
        answers: [
            "Tiger",
            "Elephant",
            "Lion",
            "Leopard"
        ],
        correct: 2
    },

    {
        question: "Which Nigerian city is known as the country's largest commercial city?",
        answers: [
            "Ibadan",
            "Abuja",
            "Lagos",
            "Enugu"
        ],
        correct: 2
    },

    {
        question: "Which instrument has black and white keys?",
        answers: [
            "Guitar",
            "Piano",
            "Drum",
            "Trumpet"
        ],
        correct: 1
    },

    {
        question: "What is 12 × 5?",
        answers: [
            "50",
            "55",
            "60",
            "65"
        ],
        correct: 2
    },

    {
        question: "Which country is famous for the Maasai people?",
        answers: [
            "Kenya",
            "Nigeria",
            "Ghana",
            "Senegal"
        ],
        correct: 0
    },

    {
        question: "Which is the largest land animal?",
        answers: [
            "Giraffe",
            "Elephant",
            "Rhinoceros",
            "Hippopotamus"
        ],
        correct: 1
    },

    {
        question: "What is the capital of Nigeria?",
        answers: [
            "Lagos",
            "Kano",
            "Abuja",
            "Ibadan"
        ],
        correct: 2
    },

    {
        question: "Which language is primarily spoken in Brazil?",
        answers: [
            "Spanish",
            "Portuguese",
            "French",
            "English"
        ],
        correct: 1
    },

    {
        question: "How many sides does a triangle have?",
        answers: [
            "2",
            "3",
            "4",
            "5"
        ],
        correct: 1
    },

    {
        question: "Which Nigerian food is traditionally made from cassava?",
        answers: [
            "Jollof rice",
            "Garri",
            "Moi moi",
            "Suya"
        ],
        correct: 1
    },

    {
        question: "Which organ pumps blood around the human body?",
        answers: [
            "Lungs",
            "Brain",
            "Heart",
            "Kidney"
        ],
        correct: 2
    },

    {
        question: "Which desert is the largest hot desert in the world?",
        answers: [
            "Kalahari",
            "Sahara",
            "Namib",
            "Gobi"
        ],
        correct: 1
    },

    {
        question: "Which Nigerian musician is known for the song 'Ye'?",
        answers: [
            "Wizkid",
            "Burna Boy",
            "Davido",
            "Olamide"
        ],
        correct: 1
    },

    {
        question: "What is the boiling point of water at sea level?",
        answers: [
            "50°C",
            "75°C",
            "100°C",
            "150°C"
        ],
        correct: 2
    },

    {
        question: "Which country gifted the Statue of Liberty to the United States?",
        answers: [
            "France",
            "Spain",
            "Italy",
            "Germany"
        ],
        correct: 0
    },

    {
        question: "Which sport uses a racket and a shuttlecock?",
        answers: [
            "Tennis",
            "Badminton",
            "Squash",
            "Cricket"
        ],
        correct: 1
    }

];


// ==================================================
// GENERATE ROOM CODE
// ==================================================

function generateRoomCode() {

    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

}


// ==================================================
// SHUFFLE ARRAY
// ==================================================

function shuffle(array) {

    const copy = [...array];

    for (
        let i = copy.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
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


// ==================================================
// CREATE RANDOM QUESTION SET
// ==================================================

function createQuestionSet() {

    return shuffle(
        questionBank
    )
        .slice(
            0,
            Math.min(
                QUESTIONS_PER_GAME,
                questionBank.length
            )
        );

}


// ==================================================
// SEND ROOM UPDATE
// ==================================================

function sendRoomUpdate(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) return;


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
                    player =>
                        player.connected
                )

        }
    );

}


// ==================================================
// SEND SCORES
// ==================================================

function sendScores(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) return;


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


// ==================================================
// SEND QUESTION
// ==================================================

function sendQuestion(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) return;


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


    room.questionStartedAt =
        Date.now();


    room.answersThisRound = {};

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
                room.currentQuestionIndex + 1,

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


    console.log(
        `Question ${
            room.currentQuestionIndex + 1
        } sent to ${roomCode}`
    );

}


// ==================================================
// NEXT QUESTION
// ==================================================

function nextQuestion(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) return;


    if (room.questionTimer) {

        clearTimeout(
            room.questionTimer
        );

        room.questionTimer =
            null;

    }


    room.currentQuestionIndex++;


    sendScores(
        roomCode
    );


    setTimeout(
        () => {

            sendQuestion(
                roomCode
            );

        },
        1500
    );

}


// ==================================================
// FINISH GAME
// ==================================================

function finishGame(roomCode) {

    const room =
        rooms[roomCode];

    if (!room) return;


    room.status =
        "finished";


    if (room.questionTimer) {

        clearTimeout(
            room.questionTimer
        );

        room.questionTimer =
            null;

    }


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
                    b.score - a.score
            );


    io.to(roomCode).emit(
        "gameFinished",
        finalPlayers
    );


    console.log(
        `Game finished in ${roomCode}`
    );

}


// ==================================================
// SOCKET CONNECTION
// ==================================================

io.on(
    "connection",
    (socket) => {

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
                gameType
            }) => {

                if (
                    !playerId ||
                    !playerName
                ) {

                    return;

                }


                let roomCode =
                    generateRoomCode();


                while (
                    rooms[roomCode]
                ) {

                    roomCode =
                        generateRoomCode();

                }


                rooms[roomCode] = {

                    hostPlayerId:
                        playerId,

                    gameType:
                        gameType,

                    status:
                        "lobby",

                    players: [],

                    questions: [],

                    currentQuestionIndex:
                        0,

                    answersThisRound: {},

                    questionStartedAt:
                        null,

                    questionTimer:
                        null

                };


                rooms[
                    roomCode
                ].players.push({

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

                });


                socket.join(
                    roomCode
                );


                socket.roomCode =
                    roomCode;


                socket.playerId =
                    playerId;


                console.log(
                    `${playerName} created room ${roomCode}`
                );


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

            }
        );


        // ==================================================
        // JOIN ROOM
        // ==================================================

        socket.on(
            "joinRoom",
            ({
                roomCode,
                playerId,
                playerName
            }) => {

                roomCode =
                    roomCode.toUpperCase();


                const room =
                    rooms[roomCode];


                if (!room) {

                    socket.emit(
                        "errorMessage",
                        "That room does not exist."
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


                const existingPlayer =
                    room.players.find(
                        player =>
                            player.playerId ===
                            playerId
                    );


                if (
                    existingPlayer
                ) {

                    existingPlayer.socketId =
                        socket.id;

                    existingPlayer.connected =
                        true;

                    existingPlayer.name =
                        playerName;

                }

                else {

                    room.players.push({

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

                    });

                }


                socket.join(
                    roomCode
                );


                socket.roomCode =
                    roomCode;


                socket.playerId =
                    playerId;


                console.log(
                    `${playerName} joined ${roomCode}`
                );


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

            }
        );


        // ==================================================
        // RECONNECT TO ROOM
        // ==================================================

        socket.on(
            "reconnectToRoom",
            ({
                roomCode,
                playerId
            }) => {

                if (
                    !roomCode ||
                    !playerId
                ) {

                    return;

                }


                roomCode =
                    roomCode.toUpperCase();


                const room =
                    rooms[roomCode];


                if (!room) {

                    socket.emit(
                        "errorMessage",
                        "This game room no longer exists."
                    );

                    return;

                }


                const player =
                    room.players.find(
                        p =>
                            p.playerId ===
                            playerId
                    );


                if (!player) {

                    socket.emit(
                        "errorMessage",
                        "You are not registered in this room."
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


                console.log(
                    `${player.name} reconnected to ${roomCode}`
                );


                sendRoomUpdate(
                    roomCode
                );


                // If a game is already running,
                // send the current question.

                if (
                    room.status ===
                    "playing"
                ) {

                    const question =
                        room.questions[
                            room.currentQuestionIndex
                        ];


                    if (question) {

                        socket.emit(
                            "newQuestion",
                            {

                                number:
                                    room.currentQuestionIndex + 1,

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


                    sendScores(
                        roomCode
                    );

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
            }) => {

                const room =
                    rooms[roomCode];


                if (!room) return;


                // Server verifies the host.

                if (
                    room.hostPlayerId !==
                    playerId
                ) {

                    console.log(
                        "Start game rejected: player is not host."
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


                room.players.forEach(
                    player => {

                        player.score =
                            0;

                    }
                );


                console.log(
                    `Game started in room ${roomCode}`
                );


                io.to(roomCode).emit(
                    "gameStarted",
                    {

                        gameType:
                            room.gameType

                    }
                );


                // Give browsers time
                // to load game.html.

                setTimeout(
                    () => {

                        sendQuestion(
                            roomCode
                        );

                        sendScores(
                            roomCode
                        );

                    },
                    1000
                );

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
            }) => {

                const room =
                    rooms[roomCode];


                if (!room) return;


                if (
                    room.status !==
                    "playing"
                ) {

                    return;

                }


                // Don't allow a player
                // to answer twice.

                if (
                    room.answersThisRound[
                        playerId
                    ]
                ) {

                    return;

                }


                const player =
                    room.players.find(
                        p =>
                            p.playerId ===
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


                const elapsed =
                    Date.now() -
                    room.questionStartedAt;


                const timeRemaining =
                    Math.max(
                        0,
                        QUESTION_TIME * 1000 -
                        elapsed
                    );


                const correct =
                    Number(answerIndex) ===
                    question.correct;


                let points = 0;


                if (correct) {

                    // Base points:
                    // 500

                    // Speed bonus:
                    // up to another 500

                    const speedBonus =
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


                    points =
                        500 +
                        speedBonus;


                    player.score +=
                        points;

                }


                room.answersThisRound[
                    playerId
                ] = true;


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


                // If everyone has answered,
                // move on immediately.

                const connectedPlayers =
                    room.players.filter(
                        p =>
                            p.connected
                    );


                const answeredPlayers =
                    connectedPlayers.filter(
                        p =>
                            room.answersThisRound[
                                p.playerId
                            ]
                    );


                if (
                    answeredPlayers.length >=
                    connectedPlayers.length
                ) {

                    nextQuestion(
                        roomCode
                    );

                }

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
                    room.players.find(
                        p =>
                            p.playerId ===
                            playerId
                    );


                if (!player) {

                    return;

                }


                player.connected =
                    false;


                sendRoomUpdate(
                    roomCode
                );


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
                            currentRoom.players.find(
                                p =>
                                    p.playerId ===
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


                        currentRoom.players =
                            currentRoom.players.filter(
                                p =>
                                    p.playerId !==
                                    playerId
                            );


                        sendRoomUpdate(
                            roomCode
                        );


                        if (
                            currentRoom.players.length ===
                            0
                        ) {

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

                        }

                    },
                    DISCONNECT_GRACE_PERIOD
                );

            }
        );

    }
);


// ==================================================
// START SERVER
// ==================================================

server.listen(
    PORT,
    () => {

        console.log(
            `Game Space server running on port ${PORT}`
        );

    }
);
