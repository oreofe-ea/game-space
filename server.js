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


/*
|--------------------------------------------------------------------------
| DATA
|--------------------------------------------------------------------------
*/

const quizPath = path.join(__dirname, "data", "quiz.json");

let questionBank = [];

try {
    questionBank = JSON.parse(
        fs.readFileSync(quizPath, "utf8")
    );
} catch (error) {
    console.error("Could not load quiz.json:", error);
}


/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const rooms = {};

const DISCONNECT_GRACE_PERIOD = 30000;

const DEFAULT_QUESTIONS_PER_GAME = 10;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 20;

const QUESTION_TIME = 15;

const GAME_READY_TIMEOUT = 10000;
const NEXT_QUESTION_DELAY = 1500;


/*
|--------------------------------------------------------------------------
| GAME TYPES
|--------------------------------------------------------------------------
*/

const GAME_TYPES = [
    "quiz",
    "scramble",
    "puzzle",
    "bingo",
    "memory"
];


/*
|--------------------------------------------------------------------------
| WORD BANK
|--------------------------------------------------------------------------
|
| Word Scramble uses this bank directly.
| A fresh selection is made every game.
|
*/

const wordBank = [
    "africa",
    "agriculture",
    "adventure",
    "balance",
    "banking",
    "business",
    "challenge",
    "community",
    "creative",
    "culture",
    "education",
    "elephant",
    "environment",
    "experience",
    "festival",
    "football",
    "friendship",
    "garden",
    "knowledge",
    "leadership",
    "library",
    "market",
    "mountain",
    "music",
    "nature",
    "network",
    "opportunity",
    "orchard",
    "puzzle",
    "question",
    "research",
    "school",
    "science",
    "scramble",
    "society",
    "strategy",
    "student",
    "success",
    "technology",
    "tradition",
    "travel",
    "university",
    "victory",
    "wildlife",
    "wisdom"
];


/*
|--------------------------------------------------------------------------
| PUZZLE BANK
|--------------------------------------------------------------------------
*/

const puzzleBank = [

    {
        type: "sequence",
        question: "What number comes next? 2, 4, 8, 16, ?",
        answers: [
            "24",
            "32",
            "30",
            "36"
        ],
        correct: 1
    },

    {
        type: "sequence",
        question: "What number comes next? 3, 6, 12, 24, ?",
        answers: [
            "36",
            "42",
            "48",
            "54"
        ],
        correct: 2
    },

    {
        type: "logic",
        question: "If all roses are flowers and some flowers fade quickly, which statement must be true?",
        answers: [
            "All roses fade quickly",
            "Some roses fade quickly",
            "Roses are flowers",
            "No roses fade"
        ],
        correct: 2
    },

    {
        type: "logic",
        question: "A clock shows 3:00. What angle is between the hour and minute hands?",
        answers: [
            "45 degrees",
            "60 degrees",
            "90 degrees",
            "120 degrees"
        ],
        correct: 2
    },

    {
        type: "sequence",
        question: "What comes next? 1, 1, 2, 3, 5, 8, ?",
        answers: [
            "11",
            "12",
            "13",
            "15"
        ],
        correct: 2
    },

    {
        type: "logic",
        question: "If you have three apples and take away two, how many apples do you have?",
        answers: [
            "1",
            "2",
            "3",
            "0"
        ],
        correct: 1
    },

    {
        type: "sequence",
        question: "What number is missing? 5, 10, 15, ?, 25",
        answers: [
            "18",
            "19",
            "20",
            "22"
        ],
        correct: 2
    },

    {
        type: "logic",
        question: "Which is the odd one out?",
        answers: [
            "Triangle",
            "Square",
            "Circle",
            "Rectangle"
        ],
        correct: 2
    },

    {
        type: "sequence",
        question: "What comes next? 100, 90, 80, 70, ?",
        answers: [
            "65",
            "60",
            "55",
            "50"
        ],
        correct: 1
    },

    {
        type: "logic",
        question: "A farmer has 10 chickens. All but 3 run away. How many remain?",
        answers: [
            "3",
            "7",
            "10",
            "0"
        ],
        correct: 0
    },

    {
        type: "sequence",
        question: "What comes next? 2, 6, 12, 20, ?",
        answers: [
            "28",
            "30",
            "32",
            "36"
        ],
        correct: 1
    },

    {
        type: "logic",
        question: "Which word does not belong?",
        answers: [
            "Apple",
            "Mango",
            "Carrot",
            "Banana"
        ],
        correct: 2
    },

    {
        type: "sequence",
        question: "What comes next? 1, 4, 9, 16, ?",
        answers: [
            "20",
            "24",
            "25",
            "30"
        ],
        correct: 2
    },

    {
        type: "logic",
        question: "If Monday is the first day, what day is the fourth day?",
        answers: [
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday"
        ],
        correct: 2
    },

    {
        type: "sequence",
        question: "What comes next? 81, 27, 9, 3, ?",
        answers: [
            "1",
            "0",
            "2",
            "6"
        ],
        correct: 0
    },

    {
        type: "logic",
        question: "Which shape has the most sides?",
        answers: [
            "Triangle",
            "Pentagon",
            "Hexagon",
            "Square"
        ],
        correct: 2
    },

    {
        type: "sequence",
        question: "What comes next? 7, 14, 21, 28, ?",
        answers: [
            "32",
            "35",
            "36",
            "42"
        ],
        correct: 1
    },

    {
        type: "logic",
        question: "If today is Wednesday, what day will it be in three days?",
        answers: [
            "Friday",
            "Saturday",
            "Sunday",
            "Monday"
        ],
        correct: 1
    },

    {
        type: "sequence",
        question: "What comes next? 50, 45, 40, 35, ?",
        answers: [
            "25",
            "28",
            "30",
            "32"
        ],
        correct: 2
    },

    {
        type: "logic",
        question: "Which one is different from the others?",
        answers: [
            "Red",
            "Blue",
            "Green",
            "Table"
        ],
        correct: 3
    }

];


/*
|--------------------------------------------------------------------------
| MEMORY CARD SYMBOLS
|--------------------------------------------------------------------------
*/

const memorySymbols = [
    "🍎",
    "🌍",
    "⭐",
    "🚀",
    "🎯",
    "🌱",
    "🎵",
    "⚡",
    "🦁",
    "🐘",
    "🏆",
    "🔥"
];


/*
|--------------------------------------------------------------------------
| UTILITY FUNCTIONS
|--------------------------------------------------------------------------
*/

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


function generateRoomCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    do {

        code = "";

        for (
            let i = 0;
            i < 5;
            i++
        ) {

            code +=
                characters[
                    Math.floor(
                        Math.random() *
                        characters.length
                    )
                ];

        }

    } while (rooms[code]);

    return code;
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
            player.id === playerId
    ) || null;
}


function getConnectedPlayers(room) {

    if (!room) {
        return [];
    }

    return room.players.filter(
        player =>
            player.connected
    );

}


function clearRoomTimers(room) {

    if (!room) {
        return;
    }

    if (room.nextQuestionTimer) {

        clearTimeout(
            room.nextQuestionTimer
        );

        room.nextQuestionTimer = null;

    }

    if (room.readyTimer) {

        clearTimeout(
            room.readyTimer
        );

        room.readyTimer = null;

    }

    if (room.bingoTimer) {

        clearInterval(
            room.bingoTimer
        );

        room.bingoTimer = null;

    }

    if (room.memoryTimer) {

        clearTimeout(
            room.memoryTimer
        );

        room.memoryTimer = null;

    }

}


function sortPlayersByScore(
    players
) {

    return [...players].sort(
        (a, b) =>
            b.score - a.score
    );

}


function normalizeText(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


function getGameTitle(
    gameType
) {

    const titles = {

        quiz:
            "Quiz Arena",

        scramble:
            "Word Scramble",

        puzzle:
            "Puzzle Rush",

        bingo:
            "Bingo",

        memory:
            "Memory Match"

    };

    return (
        titles[gameType] ||
        "Game Space"
    );

}


/*
|--------------------------------------------------------------------------
| QUIZ ENGINE
|--------------------------------------------------------------------------
*/

function createQuestionSet(
    settings = {}
) {

    let category =
        settings.category ||
        "general";

    let difficulty =
        settings.difficulty ||
        "mixed";

    let count =
        Number(
            settings.questions
        ) ||
        DEFAULT_QUESTIONS_PER_GAME;

    count = Math.max(
        MIN_QUESTIONS,
        Math.min(
            MAX_QUESTIONS,
            count
        )
    );


    let categoryQuestions =
        questionBank.filter(
            question =>
                question.category ===
                category
        );


    if (
        categoryQuestions.length === 0
    ) {

        categoryQuestions =
            [...questionBank];

    }


    let preferred = [];

    if (
        difficulty !== "mixed"
    ) {

        preferred =
            categoryQuestions.filter(
                question =>
                    question.difficulty ===
                    difficulty
            );

    }


    let remaining =
        categoryQuestions.filter(
            question =>
                !preferred.includes(
                    question
                )
        );


    const selected =
        shuffle([
            ...shuffle(preferred),
            ...shuffle(remaining)
        ]).slice(
            0,
            count
        );


    return selected;

}


function sendQuestion(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (
        !room ||
        room.status !== "playing"
    ) {
        return;
    }


    if (
        room.currentQuestionIndex >=
        room.questionSet.length
    ) {

        finishGame(
            roomCode
        );

        return;

    }


    const question =
        room.questionSet[
            room.currentQuestionIndex
        ];


    room.questionStartedAt =
        Date.now();

    room.currentQuestionAnswers = {};

    room.questionActive = true;


    const safeQuestion = {

        number:
            room.currentQuestionIndex + 1,

        total:
            room.questionSet.length,

        question:
            question.question,

        answers:
            question.answers,

        timeLimit:
            QUESTION_TIME

    };


    io.to(roomCode).emit(
        "newQuestion",
        safeQuestion
    );


    room.nextQuestionTimer =
        setTimeout(
            () => {

                if (
                    room.status !==
                    "playing"
                ) {
                    return;
                }

                if (
                    !room.questionActive
                ) {
                    return;
                }

                room.questionActive =
                    false;

                io.to(roomCode).emit(
                    "questionEnded"
                );

                nextQuestion(
                    roomCode
                );

            },
            QUESTION_TIME * 1000
        );

}


function nextQuestion(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    room.nextQuestionTimer =
        setTimeout(
            () => {

                if (
                    !rooms[roomCode]
                ) {
                    return;
                }

                room.currentQuestionIndex++;

                sendQuestion(
                    roomCode
                );

            },
            NEXT_QUESTION_DELAY
        );

}


function finishGame(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    clearRoomTimers(room);

    room.status = "finished";

    room.questionActive = false;


    const players =
        sortPlayersByScore(
            room.players
        );


    io.to(roomCode).emit(
        "gameFinished",
        players
    );

}


/*
|--------------------------------------------------------------------------
| WORD SCRAMBLE ENGINE
|--------------------------------------------------------------------------
*/

function scrambleWord(
    word
) {

    let result =
        word;

    let attempts = 0;

    while (
        result === word &&
        attempts < 20
    ) {

        result =
            shuffle(
                word.split("")
            ).join("");

        attempts++;

    }

    return result;

}


function createScrambleSet(
    count = 10
) {

    const available =
        shuffle(
            wordBank
        );


    return available.slice(
        0,
        Math.min(
            count,
            available.length
        )
    );

}


function sendScrambleWord(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (
        !room ||
        room.status !== "playing"
    ) {
        return;
    }


    if (
        room.currentQuestionIndex >=
        room.scrambleWords.length
    ) {

        finishGame(
            roomCode
        );

        return;

    }


    const word =
        room.scrambleWords[
            room.currentQuestionIndex
        ];


    room.currentScrambleWord =
        word;

    room.scrambleStartedAt =
        Date.now();

    room.scrambleAnswered = {};


    const scrambled =
        scrambleWord(
            word
        );


    io.to(roomCode).emit(
        "newScramble",
        {

            number:
                room.currentQuestionIndex + 1,

            total:
                room.scrambleWords.length,

            scrambled,
            
            wordLength:
                word.length,

            timeLimit:
                20

        }
    );


    room.nextQuestionTimer =
        setTimeout(
            () => {

                if (
                    !room.questionActive &&
                    room.status !==
                    "playing"
                ) {
                    return;
                }

                io.to(roomCode).emit(
                    "scrambleEnded"
                );

                room.currentQuestionIndex++;

                sendScrambleWord(
                    roomCode
                );

            },
            20000
        );

}


/*
|--------------------------------------------------------------------------
| PUZZLE RUSH ENGINE
|--------------------------------------------------------------------------
*/

function createPuzzleSet(
    count = 10
) {

    return shuffle(
        puzzleBank
    ).slice(
        0,
        Math.min(
            count,
            puzzleBank.length
        )
    );

}


function sendPuzzle(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (
        !room ||
        room.status !== "playing"
    ) {
        return;
    }


    if (
        room.currentQuestionIndex >=
        room.puzzleSet.length
    ) {

        finishGame(
            roomCode
        );

        return;

    }


    const puzzle =
        room.puzzleSet[
            room.currentQuestionIndex
        ];


    room.currentPuzzle =
        puzzle;

    room.puzzleStartedAt =
        Date.now();

    room.puzzleAnswers = {};


    io.to(roomCode).emit(
        "newPuzzle",
        {

            number:
                room.currentQuestionIndex + 1,

            total:
                room.puzzleSet.length,

            type:
                puzzle.type,

            question:
                puzzle.question,

            answers:
                puzzle.answers,

            timeLimit:
                20

        }
    );


    room.nextQuestionTimer =
        setTimeout(
            () => {

                io.to(roomCode).emit(
                    "puzzleEnded"
                );

                room.currentQuestionIndex++;

                sendPuzzle(
                    roomCode
                );

            },
            20000
        );

}


/*
|--------------------------------------------------------------------------
| BINGO ENGINE
|--------------------------------------------------------------------------
*/

function generateBingoCard() {

    const numbers =
        shuffle(
            Array.from(
                {
                    length: 75
                },
                (_, index) =>
                    index + 1
            )
        );


    const card =
        [];

    for (
        let row = 0;
        row < 5;
        row++
    ) {

        const currentRow = [];

        for (
            let column = 0;
            column < 5;
            column++
        ) {

            currentRow.push(
                numbers[
                    row * 5 +
                    column
                ]
            );

        }

        card.push(
            currentRow
        );

    }


    card[2][2] =
        "FREE";


    return card;

}


function createBingoState(
    room
) {

    room.bingoCalled = [];

    room.bingoCards = {};

    room.bingoWinner = null;


    room.players.forEach(
        player => {

            room.bingoCards[
                player.id
            ] =
                generateBingoCard();

        }
    );

}


function sendBingoStart(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    createBingoState(
        room
    );


    room.players.forEach(
        player => {

            io.to(
                player.socketId
            ).emit(
                "bingoCard",
                {
                    card:
                        room.bingoCards[
                            player.id
                        ]
                }
            );

        }
    );


    io.to(roomCode).emit(
        "bingoStarted",
        {
            calledNumbers: []
        }
    );


    let currentNumberIndex =
        0;


    const numbers =
        shuffle(
            Array.from(
                {
                    length: 75
                },
                (_, index) =>
                    index + 1
            )
        );


    room.bingoNumbers =
        numbers;


    room.bingoTimer =
        setInterval(
            () => {

                if (
                    room.status !==
                    "playing"
                ) {

                    clearInterval(
                        room.bingoTimer
                    );

                    return;

                }


                if (
                    currentNumberIndex >=
                    numbers.length
                ) {

                    clearInterval(
                        room.bingoTimer
                    );

                    finishGame(
                        roomCode
                    );

                    return;

                }


                const number =
                    numbers[
                        currentNumberIndex
                    ];


                currentNumberIndex++;


                room.bingoCalled.push(
                    number
                );


                io.to(roomCode).emit(
                    "bingoNumberCalled",
                    {
                        number,
                        calledNumbers:
                            room.bingoCalled
                    }
                );


            },
            1500
        );

}


function checkBingoWin(
    card,
    calledNumbers
) {

    if (!card) {
        return false;
    }


    const marked =
        card.map(
            row =>
                row.map(
                    value =>
                        value === "FREE" ||
                        calledNumbers.includes(
                            value
                        )
                )
        );


    // Rows

    for (
        let row = 0;
        row < 5;
        row++
    ) {

        if (
            marked[row].every(
                Boolean
            )
        ) {
            return true;
        }

    }


    // Columns

    for (
        let column = 0;
        column < 5;
        column++
    ) {

        let complete = true;

        for (
            let row = 0;
            row < 5;
            row++
        ) {

            if (
                !marked[row][column]
            ) {

                complete = false;

                break;

            }

        }


        if (complete) {
            return true;
        }

    }


    // Diagonal

    let diagonalOne = true;
    let diagonalTwo = true;


    for (
        let index = 0;
        index < 5;
        index++
    ) {

        if (
            !marked[index][index]
        ) {

            diagonalOne =
                false;

        }


        if (
            !marked[index][
                4 - index
            ]
        ) {

            diagonalTwo =
                false;

        }

    }


    return (
        diagonalOne ||
        diagonalTwo
    );

}


/*
|--------------------------------------------------------------------------
| MEMORY MATCH ENGINE
|--------------------------------------------------------------------------
*/

function createMemoryBoard() {

    const symbols =
        shuffle(
            memorySymbols
        ).slice(
            0,
            8
        );


    const cards =
        [];


    symbols.forEach(
        symbol => {

            cards.push(
                {
                    id:
                        cards.length,

                    symbol,

                    matched:
                        false
                }
            );


            cards.push(
                {
                    id:
                        cards.length,

                    symbol,

                    matched:
                        false
                }
            );

        }
    );


    return shuffle(
        cards
    );

}


function startMemoryGame(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    room.memoryBoard =
        createMemoryBoard();


    room.memoryTurnIndex =
        0;


    room.memoryTurnPlayerId =
        null;


    room.memoryFirstCard =
        null;


    room.memorySecondCard =
        null;


    room.memoryLocked =
        false;


    io.to(roomCode).emit(
        "memoryStarted",
        {
            board:
                room.memoryBoard.map(
                    card => ({
                        id:
                            card.id,

                        matched:
                            card.matched
                    })
                )
        }
    );


    moveToNextMemoryPlayer(
        roomCode
    );

}


function moveToNextMemoryPlayer(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    const players =
        getConnectedPlayers(
            room
        );


    if (
        players.length === 0
    ) {
        return;
    }


    if (
        room.memoryTurnIndex >=
        players.length
    ) {

        room.memoryTurnIndex = 0;

    }


    const player =
        players[
            room.memoryTurnIndex
        ];


    room.memoryTurnPlayerId =
        player.id;


    io.to(roomCode).emit(
        "memoryTurn",
        {
            playerId:
                player.id,

            playerName:
                player.name
        }
    );

}


function finishMemoryGame(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    const players =
        sortPlayersByScore(
            room.players
        );


    room.status =
        "finished";


    io.to(roomCode).emit(
        "gameFinished",
        players
    );

}


/*
|--------------------------------------------------------------------------
| SHARED GAME START
|--------------------------------------------------------------------------
*/

function startGameForRoom(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    clearRoomTimers(
        room
    );


    room.status =
        "playing";


    room.startedAt =
        Date.now();


    room.currentQuestionIndex =
        0;


    room.players.forEach(
        player => {

            player.score = 0;

        }
    );


    io.to(roomCode).emit(
        "gameStarted",
        {
            gameType:
                room.gameType,

            gameTitle:
                getGameTitle(
                    room.gameType
                )

        }
    );


    switch (
        room.gameType
    ) {

        case "quiz":

            room.questionSet =
                createQuestionSet(
                    room.settings
                );

            room.questionActive =
                false;

            room.questionStartedAt =
                null;

            sendQuestion(
                roomCode
            );

            break;


        case "scramble":

            room.scrambleWords =
                createScrambleSet(
                    room.settings.questions ||
                    DEFAULT_QUESTIONS_PER_GAME
                );

            sendScrambleWord(
                roomCode
            );

            break;


        case "puzzle":

            room.puzzleSet =
                createPuzzleSet(
                    room.settings.questions ||
                    DEFAULT_QUESTIONS_PER_GAME
                );

            sendPuzzle(
                roomCode
            );

            break;


        case "bingo":

            sendBingoStart(
                roomCode
            );

            break;


        case "memory":

            startMemoryGame(
                roomCode
            );

            break;


        default:

            room.status =
                "lobby";

            io.to(roomCode).emit(
                "errorMessage",
                "This game type is not supported."
            );

    }

}


/*
|--------------------------------------------------------------------------
| ROOM UPDATE
|--------------------------------------------------------------------------
*/

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

            gameTitle:
                getGameTitle(
                    room.gameType
                ),

            status:
                room.status,

            settings:
                room.settings,

            players:
                room.players.map(
                    player => ({

                        id:
                            player.id,

                        name:
                            player.name,

                        connected:
                            player.connected,

                        score:
                            player.score

                    })
                )

        }
    );

}


function sendScores(
    roomCode
) {

    const room =
        rooms[roomCode];

    if (!room) {
        return;
    }


    io.to(roomCode).emit(
        "scoreUpdate",
        sortPlayersByScore(
            room.players
        ).map(
            player => ({

                id:
                    player.id,

                name:
                    player.name,

                score:
                    player.score,

                connected:
                    player.connected

            })
        )
    );

}


/*
|--------------------------------------------------------------------------
| CREATE ROOM
|--------------------------------------------------------------------------
*/

io.on(
    "connection",
    socket => {

        console.log(
            "Player connected:",
            socket.id
        );


        socket.on(
            "createRoom",
            data => {

                const {

                    playerId,
                    playerName,
                    gameType,
                    settings

                } = data || {};


                if (!playerId) {

                    socket.emit(
                        "errorMessage",
                        "Missing player ID."
                    );

                    return;

                }


                if (!playerName) {

                    socket.emit(
                        "errorMessage",
                        "Please enter your name."
                    );

                    return;

                }


                const selectedGame =
                    GAME_TYPES.includes(
                        gameType
                    )
                        ? gameType
                        : "quiz";


                const roomCode =
                    generateRoomCode();


                const room = {

                    code:
                        roomCode,

                    hostPlayerId:
                        playerId,

                    gameType:
                        selectedGame,

                    settings:
                        settings || {},

                    status:
                        "lobby",

                    players: [],

                    questionSet: [],

                    currentQuestionIndex:
                        0,

                    questionActive:
                        false,

                    questionStartedAt:
                        null,

                    nextQuestionTimer:
                        null,

                    readyTimer:
                        null,

                    nextQuestionAnswers:
                        {},

                    scrambleWords:
                        [],

                    puzzleSet:
                        [],

                    bingoCards:
                        {},

                    bingoCalled:
                        [],

                    bingoTimer:
                        null,

                    memoryBoard:
                        [],

                    memoryTurnIndex:
                        0,

                    memoryTurnPlayerId:
                        null,

                    memoryFirstCard:
                        null,

                    memorySecondCard:
                        null,

                    memoryLocked:
                        false

                };


                room.players.push({

                    id:
                        playerId,

                    name:
                        String(
                            playerName
                        ).trim(),

                    socketId:
                        socket.id,

                    connected:
                        true,

                    score:
                        0,

                    ready:
                        false,

                    disconnectedAt:
                        null

                });


                rooms[
                    roomCode
                ] =
                    room;


                socket.join(
                    roomCode
                );


                socket.emit(
                    "roomCreated",
                    {
                        roomCode,
                        gameType:
                            selectedGame
                    }
                );


                sendRoomUpdate(
                    roomCode
                );


                console.log(
                    `Room ${roomCode} created by ${playerName} (${selectedGame})`
                );

            }
        );


        /*
        |--------------------------------------------------------------------------
        | JOIN ROOM
        |--------------------------------------------------------------------------
        */

        socket.on(
            "joinRoom",
            data => {

                const {

                    roomCode,
                    playerId,
                    playerName

                } = data || {};


                const code =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();


                const room =
                    rooms[code];


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

                    player.connected =
                        true;

                    player.disconnectedAt =
                        null;

                } else {

                    player = {

                        id:
                            playerId,

                        name:
                            String(
                                playerName ||
                                "Player"
                            ).trim(),

                        socketId:
                            socket.id,

                        connected:
                            true,

                        score:
                            0,

                        ready:
                            false,

                        disconnectedAt:
                            null

                    };


                    room.players.push(
                        player
                    );

                }


                socket.join(
                    code
                );


                socket.emit(
                    "joinedRoom",
                    {
                        roomCode:
                            code,

                        gameType:
                            room.gameType
                    }
                );


                sendRoomUpdate(
                    code
                );


                sendScores(
                    code
                );

            }
        );


        /*
        |--------------------------------------------------------------------------
        | RECONNECT
        |--------------------------------------------------------------------------
        */

        socket.on(
            "reconnectToRoom",
            data => {

                const {

                    roomCode,
                    playerId

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


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

                player.disconnectedAt =
                    null;


                socket.join(
                    room.code
                );


                socket.emit(
                    "reconnected",
                    {
                        roomCode:
                            room.code,

                        gameType:
                            room.gameType,

                        status:
                            room.status
                    }
                );


                sendRoomUpdate(
                    room.code
                );


                sendScores(
                    room.code
                );


                if (
                    room.gameType ===
                    "quiz" &&
                    room.status ===
                    "playing" &&
                    room.questionActive
                ) {

                    const elapsed =
                        (
                            Date.now() -
                            room.questionStartedAt
                        ) / 1000;


                    const remaining =
                        Math.max(
                            0,
                            QUESTION_TIME -
                            elapsed
                        );


                    const question =
                        room.questionSet[
                            room.currentQuestionIndex
                        ];


                    if (
                        question &&
                        remaining > 0
                    ) {

                        socket.emit(
                            "newQuestion",
                            {

                                number:
                                    room.currentQuestionIndex + 1,

                                total:
                                    room.questionSet.length,

                                question:
                                    question.question,

                                answers:
                                    question.answers,

                                timeLimit:
                                    Math.ceil(
                                        remaining
                                    )

                            }
                        );

                    }

                }

            }
        );


        /*
        |--------------------------------------------------------------------------
        | START GAME
        |--------------------------------------------------------------------------
        */

        socket.on(
            "startGame",
            data => {

                const {

                    roomCode,
                    playerId

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


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
                        "Only the host can start the game."
                    );

                    return;

                }


                if (
                    room.status !==
                    "lobby"
                ) {

                    socket.emit(
                        "errorMessage",
                        "This room is not in the lobby."
                    );

                    return;

                }


                const connectedPlayers =
                    getConnectedPlayers(
                        room
                    );


                if (
                    connectedPlayers.length ===
                    0
                ) {

                    socket.emit(
                        "errorMessage",
                        "At least one player is required."
                    );

                    return;

                }


                room.players.forEach(
                    player => {

                        player.ready =
                            false;

                        player.score =
                            0;

                    }
                );


                room.status =
                    "starting";


                sendRoomUpdate(
                    roomCode
                );


                io.to(roomCode).emit(
                    "gameStarting",
                    {
                        gameType:
                            room.gameType
                    }
                );


                room.readyTimer =
                    setTimeout(
                        () => {

                            if (
                                room.status !==
                                "starting"
                            ) {
                                return;
                            }


                            startGameForRoom(
                                roomCode
                            );

                        },
                        GAME_READY_TIMEOUT
                    );

            }
        );


        /*
        |--------------------------------------------------------------------------
        | GAME READY
        |--------------------------------------------------------------------------
        */

        socket.on(
            "gameReady",
            data => {

                const {

                    roomCode,
                    playerId

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


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


                player.ready =
                    true;


                socket.emit(
                    "gameReadyConfirmed"
                );


                const connectedPlayers =
                    getConnectedPlayers(
                        room
                    );


                const everyoneReady =
                    connectedPlayers.length >
                        0 &&
                    connectedPlayers.every(
                        player =>
                            player.ready
                    );


                if (
                    room.status ===
                    "starting" &&
                    everyoneReady
                ) {

                    clearRoomTimers(
                        room
                    );


                    startGameForRoom(
                        roomCode
                    );

                }

            }
        );


        /*
        |--------------------------------------------------------------------------
        | QUIZ ANSWER
        |--------------------------------------------------------------------------
        */

        socket.on(
            "submitAnswer",
            data => {

                const {

                    roomCode,
                    playerId,
                    answerIndex

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


                if (
                    !room ||
                    room.gameType !==
                    "quiz"
                ) {
                    return;
                }


                if (
                    room.status !==
                    "playing" ||
                    !room.questionActive
                ) {
                    return;
                }


                const player =
                    findPlayer(
                        room,
                        playerId
                    );


                if (
                    !player ||
                    !player.connected
                ) {
                    return;
                }


                if (
                    room.questionAnswers &&
                    room.questionAnswers[
                        playerId
                    ]
                ) {
                    return;
                }


                if (
                    !room.questionAnswers
                ) {

                    room.questionAnswers =
                        {};

                }


                room.questionAnswers[
                    playerId
                ] =
                    true;


                const question =
                    room.questionSet[
                        room.currentQuestionIndex
                    ];


                if (!question) {
                    return;
                }


                const elapsed =
                    (
                        Date.now() -
                        room.questionStartedAt
                    ) / 1000;


                const timeRemaining =
                    Math.max(
                        0,
                        QUESTION_TIME -
                        elapsed
                    );


                const selectedIndex =
                    Number(
                        answerIndex
                    );


                const correct =
                    selectedIndex ===
                    question.correct;


                let points = 0;


                if (correct) {

                    points =
                        500 +
                        Math.round(
                            500 *
                            (
                                timeRemaining /
                                QUESTION_TIME
                            )
                        );


                    player.score +=
                        points;

                }


                socket.emit(
                    "answerResult",
                    {
                        correct,
                        points
                    }
                );


                sendScores(
                    roomCode
                );


                const connectedPlayers =
                    getConnectedPlayers(
                        room
                    );


                const answeredCount =
                    Object.keys(
                        room.questionAnswers
                    ).length;


                if (
                    answeredCount >=
                    connectedPlayers.length
                ) {

                    room.questionActive =
                        false;


                    clearTimeout(
                        room.nextQuestionTimer
                    );


                    room.nextQuestionTimer =
                        null;


                    io.to(roomCode).emit(
                        "questionEnded"
                    );


                    nextQuestion(
                        roomCode
                    );

                }

            }
        );


        /*
        |--------------------------------------------------------------------------
        | WORD SCRAMBLE ANSWER
        |--------------------------------------------------------------------------
        */

        socket.on(
            "submitScramble",
            data => {

                const {

                    roomCode,
                    playerId,
                    answer

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


                if (
                    !room ||
                    room.gameType !==
                    "scramble" ||
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


                if (
                    room.scrambleAnswered[
                        playerId
                    ]
                ) {
                    return;
                }


                room.scrambleAnswered[
                    playerId
                ] = true;


                const correct =
                    normalizeText(
                        answer
                    ) ===
                    normalizeText(
                        room.currentScrambleWord
                    );


                let points = 0;


                if (correct) {

                    const elapsed =
                        (
                            Date.now() -
                            room.scrambleStartedAt
                        ) / 1000;


                    const remaining =
                        Math.max(
                            0,
                            20 -
                            elapsed
                        );


                    points =
                        500 +
                        Math.round(
                            500 *
                            (
                                remaining /
                                20
                            )
                        );


                    player.score +=
                        points;

                }


                socket.emit(
                    "scrambleResult",
                    {
                        correct,
                        points
                    }
                );


                sendScores(
                    roomCode
                );


                if (correct) {

                    room.currentQuestionIndex++;


                    clearTimeout(
                        room.nextQuestionTimer
                    );


                    room.nextQuestionTimer =
                        setTimeout(
                            () => {

                                sendScrambleWord(
                                    roomCode
                                );

                            },
                            NEXT_QUESTION_DELAY
                        );

                }

            }
        );


        /*
        |--------------------------------------------------------------------------
        | PUZZLE ANSWER
        |--------------------------------------------------------------------------
        */

        socket.on(
            "submitPuzzle",
            data => {

                const {

                    roomCode,
                    playerId,
                    answerIndex

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


                if (
                    !room ||
                    room.gameType !==
                    "puzzle" ||
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


                if (
                    room.puzzleAnswers[
                        playerId
                    ]
                ) {
                    return;
                }


                room.puzzleAnswers[
                    playerId
                ] = true;


                const puzzle =
                    room.currentPuzzle;


                const correct =
                    Number(
                        answerIndex
                    ) ===
                    puzzle.correct;


                let points = 0;


                if (correct) {

                    const elapsed =
                        (
                            Date.now() -
                            room.puzzleStartedAt
                        ) / 1000;


                    const remaining =
                        Math.max(
                            0,
                            20 -
                            elapsed
                        );


                    points =
                        500 +
                        Math.round(
                            500 *
                            (
                                remaining /
                                20
                            )
                        );


                    player.score +=
                        points;

                }


                socket.emit(
                    "puzzleResult",
                    {
                        correct,
                        points
                    }
                );


                sendScores(
                    roomCode
                );


                const connectedPlayers =
                    getConnectedPlayers(
                        room
                    );


                if (
                    Object.keys(
                        room.puzzleAnswers
                    ).length >=
                    connectedPlayers.length
                ) {

                    clearTimeout(
                        room.nextQuestionTimer
                    );


                    room.currentQuestionIndex++;


                    room.nextQuestionTimer =
                        setTimeout(
                            () => {

                                sendPuzzle(
                                    roomCode
                                );

                            },
                            NEXT_QUESTION_DELAY
                        );

                }

            }
        );


        /*
        |--------------------------------------------------------------------------
        | BINGO CLAIM
        |--------------------------------------------------------------------------
        */

        socket.on(
            "claimBingo",
            data => {

                const {

                    roomCode,
                    playerId

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


                if (
                    !room ||
                    room.gameType !==
                    "bingo" ||
                    room.status !==
                    "playing"
                ) {
                    return;
                }


                if (
                    room.bingoWinner
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


                const card =
                    room.bingoCards[
                        playerId
                    ];


                const won =
                    checkBingoWin(
                        card,
                        room.bingoCalled
                    );


                if (!won) {

                    socket.emit(
                        "bingoResult",
                        {
                            valid:
                                false,

                            message:
                                "Not a Bingo yet."
                        }
                    );

                    return;

                }


                room.bingoWinner =
                    playerId;


                player.score +=
                    3000;


                clearInterval(
                    room.bingoTimer
                );


                room.bingoTimer =
                    null;


                socket.emit(
                    "bingoResult",
                    {
                        valid:
                            true,

                        message:
                            "BINGO!",

                        points:
                            3000
                    }
                );


                sendScores(
                    roomCode
                );


                io.to(roomCode).emit(
                    "bingoWinner",
                    {
                        playerId:
                            player.id,

                        playerName:
                            player.name
                    }
                );


                finishGame(
                    roomCode
                );

            }
        );


        /*
        |--------------------------------------------------------------------------
        | MEMORY CARD FLIP
        |--------------------------------------------------------------------------
        */

        socket.on(
            "memoryFlip",
            data => {

                const {

                    roomCode,
                    playerId,
                    cardId

                } = data || {};


                const room =
                    rooms[
                        String(
                            roomCode || ""
                        )
                            .trim()
                            .toUpperCase()
                    ];


                if (
                    !room ||
                    room.gameType !==
                    "memory" ||
                    room.status !==
                    "playing"
                ) {
                    return;
                }


                if (
                    room.memoryLocked
                ) {
                    return;
                }


                if (
                    room.memoryTurnPlayerId !==
                    playerId
                ) {
                    return;
                }


                const card =
                    room.memoryBoard.find(
                        item =>
                            item.id ===
                            Number(cardId)
                    );


                if (
                    !card ||
                    card.matched
                ) {
                    return;
                }


                if (
                    room.memoryFirstCard &&
                    room.memoryFirstCard.id ===
                    card.id
                ) {
                    return;
                }


                if (
                    !room.memoryFirstCard
                ) {

                    room.memoryFirstCard =
                        card;


                    io.to(roomCode).emit(
                        "memoryCardFlipped",
                        {
                            cardId:
                                card.id,

                            symbol:
                                card.symbol
                        }
                    );


                    return;

                }


                room.memorySecondCard =
                    card;

                room.memoryLocked =
                    true;


                io.to(roomCode).emit(
                    "memoryCardFlipped",
                    {
                        cardId:
                            card.id,

                        symbol:
                            card.symbol
                    }
                );


                const first =
                    room.memoryFirstCard;

                const second =
                    room.memorySecondCard;


                const player =
                    findPlayer(
                        room,
                        playerId
                    );


                if (
    first.symbol ===
    second.symbol
) {

                    first.matched =
                        true;

                    second.matched =
                        true;


                    player.score +=
                        1000;


                    io.to(roomCode).emit(
                        "memoryMatch",
                        {
                            firstId:
                                first.id,

                            secondId:
                                second.id,

                            points:
                                1000
                        }
                    );


                    sendScores(
                        roomCode
                    );


                    room.memoryFirstCard =
                        null;

                    room.memorySecondCard =
                        null;

                    room.memoryLocked =
                        false;


                    const remaining =
                        room.memoryBoard.filter(
                            item =>
                                !item.matched
                        );


                    if (
                        remaining.length ===
                        0
                    ) {

                        finishMemoryGame(
                            roomCode
                        );

                    }

                } else {

                    room.memoryTimer =
                        setTimeout(
                            () => {

                                io.to(roomCode).emit(
                                    "memoryMismatch",
                                    {
                                        firstId:
                                            first.id,

                                        secondId:
                                            second.id
                                    }
                                );


                                room.memoryFirstCard =
                                    null;

                                room.memorySecondCard =
                                    null;

                                room.memoryLocked =
                                    false;


                                const players =
                                    getConnectedPlayers(
                                        room
                                    );


                                const currentIndex =
                                    players.findIndex(
                                        item =>
                                            item.id ===
                                            playerId
                                    );


                                room.memoryTurnIndex =
                                    currentIndex + 1;


                                moveToNextMemoryPlayer(
                                    roomCode
                                );

                            },
                            1000
                        );

                }

            }
        );


        /*
        |--------------------------------------------------------------------------
        | LEAVE ROOM
        |--------------------------------------------------------------------------
        */

        socket.on(
            "leaveRoom",
            data => {

                const {

                    roomCode,
                    playerId

                } = data || {};


                const code =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();


                const room =
                    rooms[code];


                if (!room) {
                    return;
                }


                const playerIndex =
                    room.players.findIndex(
                        player =>
                            player.id ===
                            playerId
                    );


                if (
                    playerIndex === -1
                ) {
                    return;
                }


                room.players.splice(
                    playerIndex,
                    1
                );


                if (
                    room.hostPlayerId ===
                    playerId
                ) {

                    const nextHost =
                        getConnectedPlayers(
                            room
                        )[0];


                    room.hostPlayerId =
                        nextHost
                            ? nextHost.id
                            : null;

                }


                if (
                    room.players.length ===
                    0
                ) {

                    clearRoomTimers(
                        room
                    );

                    delete rooms[
                        code
                    ];

                    return;

                }


                sendRoomUpdate(
                    code
                );

                sendScores(
                    code
                );

            }
        );


        /*
        |--------------------------------------------------------------------------
        | REMATCH
        |--------------------------------------------------------------------------
        */

        socket.on(
            "rematch",
            data => {

                const {

                    roomCode,
                    playerId

                } = data || {};


                const code =
                    String(
                        roomCode || ""
                    )
                        .trim()
                        .toUpperCase();


                const room =
                    rooms[code];


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


                clearRoomTimers(
                    room
                );


                room.status =
                    "lobby";


                room.currentQuestionIndex =
                    0;


                room.questionSet =
                    [];


                room.scrambleWords =
                    [];


                room.puzzleSet =
                    [];


                room.bingoCards =
                    {};

                room.bingoCalled =
                    [];

                room.bingoWinner =
                    null;


                room.memoryBoard =
                    [];

                room.memoryFirstCard =
                    null;

                room.memorySecondCard =
                    null;

                room.memoryLocked =
                    false;


                room.players.forEach(
                    player => {

                        player.score =
                            0;

                        player.ready =
                            false;

                    }
                );


                io.to(code).emit(
                    "rematchStarted",
                    {
                        gameType:
                            room.gameType
                    }
                );


                sendRoomUpdate(
                    code
                );


                sendScores(
                    code
                );

            }
        );


        /*
        |--------------------------------------------------------------------------
        | DISCONNECT
        |--------------------------------------------------------------------------
        */

        socket.on(
            "disconnect",
            () => {

                console.log(
                    "Player disconnected:",
                    socket.id
                );


                for (
                    const roomCode in rooms
                ) {

                    const room =
                        rooms[
                            roomCode
                        ];


                    const player =
                        room.players.find(
                            item =>
                                item.socketId ===
                                socket.id
                        );


                    if (!player) {
                        continue;
                    }


                    player.connected =
                        false;

                    player.disconnectedAt =
                        Date.now();


                    sendRoomUpdate(
                        roomCode
                    );


                    setTimeout(
                        () => {

                            const currentRoom =
                                rooms[
                                    roomCode
                                ];


                            if (
                                !currentRoom
                            ) {
                                return;
                            }


                            const currentPlayer =
                                currentRoom.players.find(
                                    item =>
                                        item.id ===
                                        player.id
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
                                    item =>
                                        item.id !==
                                        player.id
                                );


                            if (
                                currentRoom.hostPlayerId ===
                                player.id
                            ) {

                                const nextHost =
                                    getConnectedPlayers(
                                        currentRoom
                                    )[0];


                                currentRoom.hostPlayerId =
                                    nextHost
                                        ? nextHost.id
                                        : null;


                                if (nextHost) {

                                    io.to(
                                        roomCode
                                    ).emit(
                                        "hostChanged",
                                        {
                                            hostPlayerId:
                                                nextHost.id,

                                            hostName:
                                                nextHost.name
                                        }
                                    );

                                }

                            }


                            if (
                                currentRoom.players.length ===
                                0
                            ) {

                                clearRoomTimers(
                                    currentRoom
                                );


                                delete rooms[
                                    roomCode
                                ];


                                return;

                            }


                            sendRoomUpdate(
                                roomCode
                            );


                            sendScores(
                                roomCode
                            );


                        },
                        DISCONNECT_GRACE_PERIOD
                    );


                    break;

                }

            }
        );

    }
);


/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

server.listen(
    PORT,
    () => {

        console.log(
            `Game Space server running on port ${PORT}`
        );

    }
);
