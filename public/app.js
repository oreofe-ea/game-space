const socket = io();


// =========================
// SHOW CREATE GAME
// =========================

function showCreate() {

    document
        .getElementById("createSection")
        .classList.remove("hidden");


    document
        .getElementById("joinSection")
        .classList.add("hidden");

}


// =========================
// SHOW JOIN GAME
// =========================

function showJoin() {

    document
        .getElementById("joinSection")
        .classList.remove("hidden");


    document
        .getElementById("createSection")
        .classList.add("hidden");

}


// =========================
// CREATE GAME
// =========================

function createGame() {

    const playerName =
        document
            .getElementById("hostName")
            .value
            .trim();


    const gameType =
        document
            .getElementById("gameType")
            .value;


    if (!playerName) {

        alert("Please enter your name.");

        return;

    }


    socket.emit("createRoom", {

        playerName,

        gameType

    });

}


// =========================
// JOIN GAME
// =========================

function joinGame() {

    const playerName =
        document
            .getElementById("playerName")
            .value
            .trim();


    const roomCode =
        document
            .getElementById("roomCode")
            .value
            .trim()
            .toUpperCase();


    if (!playerName) {

        alert("Please enter your name.");

        return;

    }


    if (!roomCode) {

        alert("Please enter the room code.");

        return;

    }


    socket.emit("joinRoom", {

        playerName,

        roomCode

    });

}


// =========================
// ROOM CREATED
// =========================

socket.on(
    "roomCreated",
    ({ roomCode, gameType, playerId, isHost }) => {

        localStorage.setItem(
            "roomCode",
            roomCode
        );

        localStorage.setItem(
            "gameType",
            gameType
        );

        localStorage.setItem(
            "playerId",
            playerId
        );

        localStorage.setItem(
            "isHost",
            isHost
        );

        window.location.href =
            `/lobby.html?room=${roomCode}`;

    }
);


// =========================
// ROOM JOINED
// =========================

socket.on(
    "joinedRoom",
    ({ roomCode, gameType, playerId, isHost }) => {

        localStorage.setItem(
            "roomCode",
            roomCode
        );

        localStorage.setItem(
            "gameType",
            gameType
        );

        localStorage.setItem(
            "playerId",
            playerId
        );

        localStorage.setItem(
            "isHost",
            isHost
        );

        window.location.href =
            `/lobby.html?room=${roomCode}`;

    }
);


// =========================
// ERROR
// =========================

socket.on(
    "errorMessage",
    (message) => {

        alert(message);

    }
);
