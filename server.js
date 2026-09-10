const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// =========================
// GAME ROOMS
// =========================

const rooms = {};

const DISCONNECT_GRACE_PERIOD = 30000;


// =========================
// GENERATE ROOM CODE
// =========================

function generateRoomCode() {

    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

}


// =========================
// SEND ROOM UPDATE
// =========================

function sendRoomUpdate(roomCode) {

    const room = rooms[roomCode];

    if (!room) return;

    io.to(roomCode).emit(
        "roomUpdate",
        {
            hostPlayerId: room.hostPlayerId,
            gameType: room.gameType,
            status: room.status,

            // Only show currently connected players
            players: room.players.filter(
                player => player.connected
            )
        }
    );

}


// =========================
// SOCKET CONNECTION
// =========================

io.on("connection", (socket) => {

    console.log(
        "Player connected:",
        socket.id
    );


    // =========================
    // CREATE ROOM
    // =========================

    socket.on(
        "createRoom",
        ({ playerId, playerName, gameType }) => {

            if (!playerId || !playerName) {
                return;
            }

            let roomCode = generateRoomCode();

            while (rooms[roomCode]) {
                roomCode = generateRoomCode();
            }


            rooms[roomCode] = {

                hostPlayerId: playerId,

                gameType: gameType,

                status: "lobby",

                players: []

            };


            rooms[roomCode].players.push({

                playerId: playerId,

                socketId: socket.id,

                name: playerName,

                score: 0,

                connected: true

            });


            socket.join(roomCode);

            socket.roomCode = roomCode;

            socket.playerId = playerId;


            console.log(
                `${playerName} created room ${roomCode}`
            );


            socket.emit(
                "roomCreated",
                {
                    roomCode: roomCode,
                    gameType: gameType,
                    playerId: playerId
                }
            );


            sendRoomUpdate(roomCode);

        }
    );


    // =========================
    // JOIN ROOM
    // =========================

    socket.on(
        "joinRoom",
        ({ roomCode, playerId, playerName }) => {

            roomCode = roomCode.toUpperCase();

            const room = rooms[roomCode];


            if (!room) {

                socket.emit(
                    "errorMessage",
                    "That room does not exist."
                );

                return;
            }


            if (room.status !== "lobby") {

                socket.emit(
                    "errorMessage",
                    "This game has already started."
                );

                return;
            }


            // Check whether this player is reconnecting
            const existingPlayer =
                room.players.find(
                    player =>
                        player.playerId === playerId
                );


            if (existingPlayer) {

                existingPlayer.socketId =
                    socket.id;

                existingPlayer.connected =
                    true;

                existingPlayer.name =
                    playerName;

            }

            else {

                room.players.push({

                    playerId: playerId,

                    socketId: socket.id,

                    name: playerName,

                    score: 0,

                    connected: true

                });

            }


            socket.join(roomCode);

            socket.roomCode = roomCode;

            socket.playerId = playerId;


            console.log(
                `${playerName} joined ${roomCode}`
            );


            socket.emit(
                "joinedRoom",
                {
                    roomCode: roomCode,
                    gameType: room.gameType,
                    playerId: playerId
                }
            );


            sendRoomUpdate(roomCode);

        }
    );


    // =========================
    // RECONNECT TO ROOM
    // =========================

    socket.on(
        "reconnectToRoom",
        ({ roomCode, playerId }) => {

            if (!roomCode || !playerId) {
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
                        p.playerId === playerId
                );


            if (!player) {

                socket.emit(
                    "errorMessage",
                    "You are not registered in this room."
                );

                return;
            }


            // Update the player's new socket
            player.socketId =
                socket.id;

            player.connected =
                true;


            socket.join(roomCode);

            socket.roomCode =
                roomCode;

            socket.playerId =
                playerId;


            console.log(
                `${player.name} reconnected to ${roomCode}`
            );


            sendRoomUpdate(roomCode);

        }
    );


    // =========================
    // START GAME
    // =========================

    socket.on(
        "startGame",
        ({ roomCode, playerId }) => {

            const room =
                rooms[roomCode];


            if (!room) return;


            // IMPORTANT:
            // Host is identified by persistent playerId,
            // NOT temporary socket.id.

            if (
                room.hostPlayerId !==
                playerId
            ) {

                console.log(
                    "Start game rejected: not host"
                );

                return;
            }


            room.status =
                "playing";


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

        }
    );


    // =========================
    // DISCONNECT
    // =========================

    socket.on("disconnect", () => {

        console.log(
            "Player disconnected:",
            socket.id
        );


        const roomCode =
            socket.roomCode;

        const playerId =
            socket.playerId;


        if (!roomCode || !playerId) {
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
                    p.playerId === playerId
            );


        if (!player) {
            return;
        }


        // Mark disconnected rather than
        // immediately deleting the player.

        player.connected =
            false;


        sendRoomUpdate(roomCode);


        // Give the player 30 seconds to reconnect.
        setTimeout(() => {

            const currentRoom =
                rooms[roomCode];


            if (!currentRoom) {
                return;
            }


            const currentPlayer =
                currentRoom.players.find(
                    p =>
                        p.playerId === playerId
                );


            if (!currentPlayer) {
                return;
            }


            // If they reconnected,
            // leave them in the room.

            if (
                currentPlayer.connected
            ) {

                return;

            }


            // Otherwise remove them.

            currentRoom.players =
                currentRoom.players.filter(
                    p =>
                        p.playerId !==
                        playerId
                );


            sendRoomUpdate(roomCode);


            // Delete empty rooms.

            if (
                currentRoom.players.length ===
                0
            ) {

                delete rooms[roomCode];

                console.log(
                    `Room ${roomCode} deleted`
                );

            }

        }, DISCONNECT_GRACE_PERIOD);

    });

});


// =========================
// START SERVER
// =========================

server.listen(PORT, () => {

    console.log(
        `Game Space server running on port ${PORT}`
    );

});
