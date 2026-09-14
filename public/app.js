// ========================================
// GAME SPACE
// HOME / JOIN LOGIC
// ========================================

const socket = io();


// ========================================
// PLAYER ID
// ========================================

function getPlayerId() {

    let playerId = localStorage.getItem("playerId");

    if (!playerId) {

        playerId = crypto.randomUUID();

        localStorage.setItem(
            "playerId",
            playerId
        );
    }

    return playerId;
}


const playerId = getPlayerId();


// ========================================
// ELEMENTS
// ========================================

const joinButton =
    document.getElementById("joinGameButton");

const joinSection =
    document.getElementById("joinSection");

const joinForm =
    document.getElementById("joinForm");

const playerNameInput =
    document.getElementById("playerName");

const roomCodeInput =
    document.getElementById("roomCode");


// ========================================
// RESTORE PLAYER NAME
// ========================================

if (playerNameInput) {

    const savedName =
        localStorage.getItem("playerName");

    if (savedName) {
        playerNameInput.value = savedName;
    }
}


// ========================================
// SHOW JOIN PANEL
// ========================================

function showJoin() {

    if (!joinSection) {
        return;
    }

    joinSection.classList.remove("hidden");

    joinSection.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    if (playerNameInput) {
        setTimeout(() => {
            playerNameInput.focus();
        }, 400);
    }
}


// ========================================
// JOIN BUTTON
// ========================================

if (joinButton) {

    joinButton.addEventListener(
        "click",
        showJoin
    );
}


// ========================================
// ROOM CODE FORMATTING
// ========================================

if (roomCodeInput) {

    roomCodeInput.addEventListener(
        "input",
        () => {

            roomCodeInput.value =
                roomCodeInput.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6);
        }
    );
}


// ========================================
// JOIN GAME
// ========================================

function joinGame() {

    if (!playerNameInput || !roomCodeInput) {
        return;
    }


    const playerName =
        playerNameInput.value.trim();


    const roomCode =
        roomCodeInput.value
            .trim()
            .toUpperCase();


    // -------------------------------
    // VALIDATION
    // -------------------------------

    if (!playerName) {

        alert(
            "Please enter your name."
        );

        playerNameInput.focus();

        return;
    }


    if (roomCode.length !== 6) {

        alert(
            "Please enter a valid 6-character room code."
        );

        roomCodeInput.focus();

        return;
    }


    // -------------------------------
    // SAVE PLAYER INFORMATION
    // -------------------------------

    localStorage.setItem(
        "playerName",
        playerName
    );

    localStorage.setItem(
        "roomCode",
        roomCode
    );


    // -------------------------------
    // JOIN SERVER ROOM
    // -------------------------------

    socket.emit(
        "joinRoom",
        {
            playerId: playerId,
            playerName: playerName,
            roomCode: roomCode
        }
    );
}


// ========================================
// JOIN FORM SUBMISSION
// ========================================

if (joinForm) {

    joinForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            joinGame();
        }
    );
}


// ========================================
// ROOM CREATED
// ========================================

socket.on(
    "roomCreated",
    ({
        roomCode,
        gameType,
        playerId: serverPlayerId
    }) => {

        // Keep the server's player ID
        // if one was provided.

        const finalPlayerId =
            serverPlayerId || playerId;


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
            finalPlayerId
        );


        window.location.href =
            `/lobby.html?room=${encodeURIComponent(roomCode)}`;
    }
);


// ========================================
// ROOM JOINED
// ========================================

socket.on(
    "joinedRoom",
    ({
        roomCode,
        gameType,
        playerId: serverPlayerId
    }) => {

        const finalPlayerId =
            serverPlayerId || playerId;


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
            finalPlayerId
        );


        window.location.href =
            `/lobby.html?room=${encodeURIComponent(roomCode)}`;
    }
);


// ========================================
// SERVER ERROR
// ========================================

socket.on(
    "errorMessage",
    (message) => {

        alert(
            message || "Something went wrong."
        );
    }
);


// ========================================
// CONNECTION ERROR
// ========================================

socket.on(
    "connect_error",
    () => {

        console.error(
            "Could not connect to Game Space server."
        );
    }
);


// ========================================
// CONNECTION SUCCESS
// ========================================

socket.on(
    "connect",
    () => {

        console.log(
            "Connected to Game Space server:",
            socket.id
        );
    }
);
