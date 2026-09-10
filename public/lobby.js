const socket = io();


const params =
    new URLSearchParams(
        window.location.search
    );


const roomCode =
    params.get("room");


const isHost =
    localStorage.getItem("isHost") === "true";


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

    alert("Room code copied!");

}


// =========================
// START GAME
// =========================

function startGame() {

    if (!isHost) {

        return;

    }


    socket.emit(
        "startGame",
        {
            roomCode: roomCode
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


        playersContainer.innerHTML = "";


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


                playersContainer.appendChild(
                    playerElement
                );

            }
        );


        // Show controls to host
        if (isHost) {

            document.getElementById(
                "startButton"
            ).style.display = "block";


            document.getElementById(
                "waiting"
            ).style.display = "none";

        }

        else {

            document.getElementById(
                "startButton"
            ).style.display = "none";


            document.getElementById(
                "waiting"
            ).style.display = "block";

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
