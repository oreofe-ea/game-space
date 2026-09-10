const socket = io();


// =========================
// GET ROOM
// =========================

const params =
    new URLSearchParams(
        window.location.search
    );


const roomCode =
    params.get("room");


// =========================
// GET PLAYER ID
// =========================

const playerId =
    localStorage.getItem(
        "playerId"
    );


// =========================
// DISPLAY ROOM CODE
// =========================

document.getElementById(
    "roomCodeDisplay"
).textContent = roomCode;


// =========================
// COPY ROOM CODE
// =========================

function copyRoomCode() {

    navigator.clipboard.writeText(
        roomCode
    );

    alert(
        "Room code copied!"
    );

}


// =========================
// RECONNECT TO ROOM
// =========================

socket.on(
    "connect",
    () => {

        socket.emit(
            "reconnectToRoom",
            {

                roomCode:
                    roomCode,

                playerId:
                    playerId

            }
        );

    }
);


// =========================
// START GAME
// =========================

function startGame() {

    socket.emit(
        "startGame",
        {

            roomCode:
                roomCode,

            playerId:
                playerId

        }
    );

}


// =========================
// ROOM UPDATES
// =========================

socket.on(
    "roomUpdate",
    (room) => {

        const playersContainer =
            document.getElementById(
                "players"
            );


        playersContainer.innerHTML =
            "";


        room.players.forEach(
            (player) => {

                const playerElement =
                    document.createElement(
                        "div"
                    );


                playerElement.className =
                    "player";


                playerElement.textContent =
                    player.name;


                // Show host label
                if (
                    player.playerId ===
                    room.hostPlayerId
                ) {

                    playerElement.textContent +=
                        " 👑";

                }


                playersContainer.appendChild(
                    playerElement
                );

            }
        );


        // =========================
        // DETERMINE HOST
        // =========================

        const isHost =
            room.hostPlayerId ===
            playerId;


        const startButton =
            document.getElementById(
                "startButton"
            );


        const waiting =
            document.getElementById(
                "waiting"
            );


        if (isHost) {

            startButton.style.display =
                "block";

            waiting.style.display =
                "none";

        }

        else {

            startButton.style.display =
                "none";

            waiting.style.display =
                "block";

        }

    }
);


// =========================
// GAME STARTED
// =========================

socket.on(
    "gameStarted",
    ({ gameType }) => {

        localStorage.setItem(
            "gameType",
            gameType
        );


        window.location.href =
            `/game.html?room=${roomCode}`;

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
