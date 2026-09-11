const socket = io();


// =========================
// PLAYER ID
// =========================

function getPlayerId() {

    let playerId =
        localStorage.getItem(
            "playerId"
        );

    if (!playerId) {

        playerId =
            crypto.randomUUID();

        localStorage.setItem(
            "playerId",
            playerId
        );
    }

    return playerId;
}


const playerId =
    getPlayerId();


// =========================
// JOIN PANEL
// =========================

function showJoin() {

    const joinSection =
        document.getElementById(
            "joinSection"
        );

    if (!joinSection) {
        return;
    }

    joinSection.classList.remove(
        "hidden"
    );

    joinSection.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


// =========================
// JOIN GAME
// =========================

function joinGame() {

    const playerName =
        document
            .getElementById(
                "playerName"
            )
            .value
            .trim();


    const roomCode =
        document
            .getElementById(
                "roomCode"
            )
            .value
            .trim()
            .toUpperCase();


    if (!playerName) {

        alert(
            "Please enter your name."
        );

        return;
    }


    if (!roomCode) {

        alert(
            "Please enter the room code."
        );

        return;
    }


    localStorage.setItem(
        "playerName",
        playerName
    );


    socket.emit(
        "joinRoom",
        {

            playerId:
                playerId,

            playerName:
                playerName,

            roomCode:
                roomCode

        }
    );
}


// =========================
// ROOM CREATED
// =========================

socket.on(
    "roomCreated",
    ({
        roomCode,
        gameType,
        playerId
    }) => {

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


        window.location.href =
            `/lobby.html?room=${roomCode}`;

    }
);


// =========================
// ROOM JOINED
// =========================

socket.on(
    "joinedRoom",
    ({
        roomCode,
        gameType,
        playerId
    }) => {

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


        window.location.href =
            `/lobby.html?room=${roomCode}`;

    }
);


// =========================
// ERRORS
// =========================

socket.on(
    "errorMessage",
    (message) => {

        alert(message);

    }
);
