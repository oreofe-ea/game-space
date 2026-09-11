const socket = io();


/*
|--------------------------------------------------------------------------
| ROOM / PLAYER INFORMATION
|--------------------------------------------------------------------------
*/

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
| VALIDATION
|--------------------------------------------------------------------------
*/

if (
    !roomCode ||
    !playerId
) {

    window.location.href =
        "/";

}


/*
|--------------------------------------------------------------------------
| DISPLAY ROOM CODE
|--------------------------------------------------------------------------
*/

if (roomCodeElement) {

    roomCodeElement.textContent =
        roomCode || "------";

}


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


        /*
        |--------------------------------------------------------------------------
        | JOIN / RECONNECT THE PLAYER
        |--------------------------------------------------------------------------
        */

        socket.emit(
            "joinRoom",
            {
                roomCode:
                    roomCode,

                playerId:
                    playerId,

                playerName:
                    playerName
            }
        );

    }
);


/*
|--------------------------------------------------------------------------
| ROOM UPDATE
|--------------------------------------------------------------------------
|
| IMPORTANT:
| The server calls this event "roomUpdate".
| It contains hostPlayerId.
|
|--------------------------------------------------------------------------
*/

socket.on(
    "roomUpdate",
    (room) => {

        if (!room) {
            return;
        }


        console.log(
            "Room update:",
            room
        );


        /*
        |--------------------------------------------------------------------------
        | RENDER PLAYERS
        |--------------------------------------------------------------------------
        */

        renderPlayers(
            room.players || [],
            room.hostPlayerId
        );


        /*
        |--------------------------------------------------------------------------
        | DETERMINE HOST
        |--------------------------------------------------------------------------
        |
        | The SERVER is the source of truth.
        |
        */

        const isHost =
            room.hostPlayerId ===
            playerId;


        if (isHost) {

            /*
            |--------------------------------------------------------------------------
            | HOST VIEW
            |--------------------------------------------------------------------------
            */

            hostControls.classList.remove(
                "hidden"
            );

            waitingMessage.classList.add(
                "hidden"
            );


            startMessage.textContent =
                "You're the host. Start the game when everyone is ready.";

        } else {

            /*
            |--------------------------------------------------------------------------
            | PLAYER VIEW
            |--------------------------------------------------------------------------
            */

            hostControls.classList.add(
                "hidden"
            );

            waitingMessage.classList.remove(
                "hidden"
            );

        }


        /*
        |--------------------------------------------------------------------------
        | STORE GAME TYPE
        |--------------------------------------------------------------------------
        */

        if (room.gameType) {

            localStorage.setItem(
                "gameType",
                room.gameType
            );

        }

    }
);


/*
|--------------------------------------------------------------------------
| PLAYERS UPDATE
|--------------------------------------------------------------------------
|
| Kept for compatibility if the server sends
| a separate player update in future.
|--------------------------------------------------------------------------
*/

socket.on(
    "playersUpdate",
    (players) => {

        renderPlayers(
            players || [],
            null
        );

    }
);


/*
|--------------------------------------------------------------------------
| RENDER PLAYERS
|--------------------------------------------------------------------------
*/

function renderPlayers(
    players,
    hostPlayerId
) {

    if (!playersList) {
        return;
    }


    playersList.innerHTML =
        "";


    if (playerCount) {

        playerCount.textContent =
            players.length;

    }


    if (
        players.length ===
        0
    ) {

        playersList.innerHTML = `
            <div class="empty-players">
                Waiting for players...
            </div>
        `;

        return;

    }


    players.forEach(
        (
            player,
            index
        ) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "lobby-player";


            /*
            |--------------------------------------------------------------------------
            | AVATAR
            |--------------------------------------------------------------------------
            */

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


            /*
            |--------------------------------------------------------------------------
            | PLAYER INFORMATION
            |--------------------------------------------------------------------------
            */

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


            /*
            |--------------------------------------------------------------------------
            | PLAYER STATUS
            |--------------------------------------------------------------------------
            */

            const status =
                document.createElement(
                    "span"
                );


            const isHost =
                hostPlayerId &&
                player.playerId ===
                    hostPlayerId;


            if (isHost) {

                status.textContent =
                    "Host";

                status.classList.add(
                    "host-status"
                );

            } else {

                status.textContent =
                    "Player";

            }


            info.appendChild(
                name
            );

            info.appendChild(
                status
            );


            /*
            |--------------------------------------------------------------------------
            | PLAYER NUMBER
            |--------------------------------------------------------------------------
            */

            const number =
                document.createElement(
                    "span"
                );

            number.className =
                "player-number";

            number.textContent =
                `#${index + 1}`;


            /*
            |--------------------------------------------------------------------------
            | BUILD ROW
            |--------------------------------------------------------------------------
            */

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
| GET PLAYER INITIAL
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

if (copyRoomCodeButton) {

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


                /*
                |--------------------------------------------------------------------------
                | FALLBACK
                |--------------------------------------------------------------------------
                */

                const textArea =
                    document.createElement(
                        "textarea"
                    );

                textArea.value =
                    roomCode;

                document.body.appendChild(
                    textArea
                );

                textArea.select();

                document.execCommand(
                    "copy"
                );

                textArea.remove();


                copyRoomCodeButton.textContent =
                    "Copied!";


                setTimeout(
                    () => {

                        copyRoomCodeButton.textContent =
                            "Copy code";

                    },
                    1500
                );

            }

        }
    );

}


/*
|--------------------------------------------------------------------------
| START GAME
|--------------------------------------------------------------------------
*/

if (startGameButton) {

    startGameButton.addEventListener(
        "click",
        () => {

            /*
            |--------------------------------------------------------------------------
            | Prevent double clicks
            |--------------------------------------------------------------------------
            */

            startGameButton.disabled =
                true;


            startGameButton.textContent =
                "Starting...";


            if (startMessage) {

                startMessage.textContent =
                    "Getting everyone ready...";

            }


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

}


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


        const selectedGame =
            data?.gameType ||
            localStorage.getItem(
                "gameType"
            ) ||
            "quiz";


        localStorage.setItem(
            "gameType",
            selectedGame
        );


        window.location.href =
            `/game.html?room=${encodeURIComponent(roomCode)}`;

    }
);


/*
|--------------------------------------------------------------------------
| SERVER ERROR
|--------------------------------------------------------------------------
*/

socket.on(
    "errorMessage",
    (message) => {

        console.error(
            "Server error:",
            message
        );


        showError(
            message
        );


        if (startGameButton) {

            startGameButton.disabled =
                false;

            startGameButton.textContent =
                "Start game";

        }

    }
);


/*
|--------------------------------------------------------------------------
| CONNECTION ERROR
|--------------------------------------------------------------------------
*/

socket.on(
    "connect_error",
    (error) => {

        console.error(
            "Socket connection error:",
            error
        );


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

    if (!lobbyError) {
        return;
    }


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
