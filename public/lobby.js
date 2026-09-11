const socket = io();

const params =
    new URLSearchParams(
        window.location.search
    );

const roomCode =
    params.get("room");

const playerId =
    localStorage.getItem(
        "playerId"
    );

const playerName =
    localStorage.getItem(
        "playerName"
    );


/*
|--------------------------------------------------------------------------
| ELEMENTS
|--------------------------------------------------------------------------
*/

const roomCodeElement =
    document.getElementById(
        "roomCode"
    );

const copyRoomCodeButton =
    document.getElementById(
        "copyRoomCode"
    );

const playersList =
    document.getElementById(
        "playersList"
    );

const playerCount =
    document.getElementById(
        "playerCount"
    );

const hostControls =
    document.getElementById(
        "hostControls"
    );

const startGameButton =
    document.getElementById(
        "startGameButton"
    );

const startMessage =
    document.getElementById(
        "startMessage"
    );

const waitingMessage =
    document.getElementById(
        "waitingMessage"
    );

const lobbyError =
    document.getElementById(
        "lobbyError"
    );


/*
|--------------------------------------------------------------------------
| BASIC VALIDATION
|--------------------------------------------------------------------------
*/

if (!roomCode || !playerId) {

    window.location.href =
        "/";

}


/*
|--------------------------------------------------------------------------
| DISPLAY ROOM CODE
|--------------------------------------------------------------------------
*/

roomCodeElement.textContent =
    roomCode || "------";


/*
|--------------------------------------------------------------------------
| CONNECT
|--------------------------------------------------------------------------
*/

socket.on(
    "connect",
    () => {

        console.log(
            "Connected to lobby:",
            socket.id
        );

        socket.emit(
            "joinRoom",
            {
                roomCode:
                    roomCode,

                playerId:
                    playerId,

                name:
                    playerName
            }
        );

    }
);


/*
|--------------------------------------------------------------------------
| ROOM STATE
|--------------------------------------------------------------------------
*/

socket.on(
    "roomState",
    (room) => {

        if (!room) {
            return;
        }

        renderPlayers(
            room.players || []
        );

        const isHost =
            room.hostPlayerId ===
            playerId;

        if (isHost) {

            hostControls.classList.remove(
                "hidden"
            );

            waitingMessage.classList.add(
                "hidden"
            );

        } else {

            hostControls.classList.add(
                "hidden"
            );

            waitingMessage.classList.remove(
                "hidden"
            );

        }

    }
);


/*
|--------------------------------------------------------------------------
| PLAYER UPDATE
|--------------------------------------------------------------------------
*/

socket.on(
    "playersUpdate",
    (players) => {

        renderPlayers(
            players || []
        );

    }
);


/*
|--------------------------------------------------------------------------
| RENDER PLAYERS
|--------------------------------------------------------------------------
*/

function renderPlayers(
    players
) {

    playersList.innerHTML =
        "";

    playerCount.textContent =
        players.length;


    if (!players.length) {

        playersList.innerHTML = `
            <div class="empty-players">
                Waiting for players...
            </div>
        `;

        return;
    }


    players.forEach(
        (player, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "lobby-player";


            const avatar =
                document.createElement(
                    "div"
                );

            avatar.className =
                "player-avatar";

            avatar.textContent =
                getInitial(
                    player.name
                );


            const info =
                document.createElement(
                    "div"
                );

            info.className =
                "player-info";


            const name =
                document.createElement(
                    "strong"
                );

            name.textContent =
                player.name;


            const status =
                document.createElement(
                    "span"
                );

            status.textContent =
                player.playerId ===
                getHostId(players)
                    ? "Host"
                    : "Player";


            info.appendChild(
                name
            );

            info.appendChild(
                status
            );


            const number =
                document.createElement(
                    "span"
                );

            number.className =
                "player-number";

            number.textContent =
                `#${index + 1}`;


            row.appendChild(
                avatar
            );

            row.appendChild(
                info
            );

            row.appendChild(
                number
            );


            playersList.appendChild(
                row
            );

        }
    );

}


/*
|--------------------------------------------------------------------------
| FIND HOST
|--------------------------------------------------------------------------
*/

function getHostId(
    players
) {

    /*
     * The server's roomState normally tells us the host.
     * If that information isn't available here,
     * the first player is treated as the visual host.
     */

    if (
        players.length > 0
    ) {
        return players[0].playerId;
    }

    return null;

}


/*
|--------------------------------------------------------------------------
| INITIAL
|--------------------------------------------------------------------------
*/

function getInitial(
    name
) {

    if (!name) {
        return "?";
    }

    return name
        .trim()
        .charAt(0)
        .toUpperCase();

}


/*
|--------------------------------------------------------------------------
| COPY ROOM CODE
|--------------------------------------------------------------------------
*/

copyRoomCodeButton.addEventListener(
    "click",
    async () => {

        try {

            await navigator.clipboard.writeText(
                roomCode
            );

            copyRoomCodeButton.textContent =
                "Copied!";

            setTimeout(
                () => {

                    copyRoomCodeButton.textContent =
                        "Copy code";

                },
                1500
            );

        } catch (error) {

            console.error(
                "Could not copy room code:",
                error
            );

        }

    }
);


/*
|--------------------------------------------------------------------------
| START GAME
|--------------------------------------------------------------------------
*/

startGameButton.addEventListener(
    "click",
    () => {

        startGameButton.disabled =
            true;

        startGameButton.textContent =
            "Starting...";

        startMessage.textContent =
            "Getting everyone ready...";

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
);


/*
|--------------------------------------------------------------------------
| GAME STARTED
|--------------------------------------------------------------------------
*/

socket.on(
    "gameStarted",
    (data) => {

        console.log(
            "Game starting:",
            data
        );

        const gameType =
            data?.gameType ||
            "quiz";

        localStorage.setItem(
            "gameType",
            gameType
        );

        window.location.href =
            `/game.html?room=${encodeURIComponent(roomCode)}`;

    }
);


/*
|--------------------------------------------------------------------------
| ERROR
|--------------------------------------------------------------------------
*/

socket.on(
    "errorMessage",
    (message) => {

        showError(
            message
        );

        startGameButton.disabled =
            false;

        startGameButton.textContent =
            "Start game";

    }
);


/*
|--------------------------------------------------------------------------
| CONNECTION ERROR
|--------------------------------------------------------------------------
*/

socket.on(
    "connect_error",
    () => {

        showError(
            "Connection lost. Reconnecting..."
        );

    }
);


/*
|--------------------------------------------------------------------------
| ERROR DISPLAY
|--------------------------------------------------------------------------
*/

function showError(
    message
) {

    lobbyError.textContent =
        message;

    lobbyError.classList.remove(
        "hidden"
    );

}


/*
|--------------------------------------------------------------------------
| LEAVE LOBBY
|--------------------------------------------------------------------------
*/

function leaveLobby() {

    socket.disconnect();

    window.location.href =
        "/games.html";

}
