const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve the public folder
app.use(express.static(path.join(__dirname, "public")));

// Store active game rooms
const rooms = {};


// Generate a random 6-character room code
function generateRoomCode() {
    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
}


// When someone connects
io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);


    // =========================
    // CREATE GAME ROOM
    // =========================

    socket.on("createRoom", ({ playerName, gameType }) => {

        let roomCode = generateRoomCode();

        // Make sure the room code isn't already being used
        while (rooms[roomCode]) {
            roomCode = generateRoomCode();
        }


        // Create the room
        rooms[roomCode] = {

            host: socket.id,

            gameType: gameType,

            status: "lobby",

            players: []

        };


        // Add host as first player
        rooms[roomCode].players.push({

            id: socket.id,

            name: playerName,

            score: 0

        });


        // Put host inside the Socket.IO room
        socket.join(roomCode);

        // Remember the room
        socket.roomCode = roomCode;


        console.log(
            `${playerName} created room ${roomCode}`
        );


        // Tell the host the room was created
        socket.emit("roomCreated", {

            roomCode: roomCode,

            gameType: gameType

        });


        // Send updated room information
        io.to(roomCode).emit(
            "roomUpdate",
            rooms[roomCode]
        );

    });


    // =========================
    // JOIN GAME ROOM
    // =========================

    socket.on("joinRoom", ({ roomCode, playerName }) => {

        roomCode = roomCode.toUpperCase();

        const room = rooms[roomCode];


        // Room doesn't exist
        if (!room) {

            socket.emit(
                "errorMessage",
                "That room does not exist."
            );

            return;
        }


        // Game already started
        if (room.status !== "lobby") {

            socket.emit(
                "errorMessage",
                "This game has already started."
            );

            return;
        }


        // Add player
        room.players.push({

            id: socket.id,

            name: playerName,

            score: 0

        });


        // Join Socket.IO room
        socket.join(roomCode);

        socket.roomCode = roomCode;


        console.log(
            `${playerName} joined ${roomCode}`
        );


        // Tell player they successfully joined
        socket.emit("joinedRoom", {

            roomCode: roomCode,

            gameType: room.gameType

        });


        // Update everyone in the room
        io.to(roomCode).emit(
            "roomUpdate",
            room
        );

    });


    // =========================
    // START GAME
    // =========================

    socket.on("startGame", ({ roomCode }) => {

        const room = rooms[roomCode];

        if (!room) return;


        // Only host can start
        if (room.host !== socket.id) {

            return;

        }


        room.status = "playing";


        io.to(roomCode).emit(
            "gameStarted",
            {
                gameType: room.gameType
            }
        );

    });


    // =========================
    // PLAYER DISCONNECTS
    // =========================

    socket.on("disconnect", () => {

        console.log(
            "Player disconnected:",
            socket.id
        );


        for (const roomCode in rooms) {

            const room = rooms[roomCode];


            const playerIndex =
                room.players.findIndex(
                    player => player.id === socket.id
                );


            if (playerIndex !== -1) {

                room.players.splice(
                    playerIndex,
                    1
                );


                // Update remaining players
                io.to(roomCode).emit(
                    "roomUpdate",
                    room
                );

            }


            // Delete empty rooms
            if (room.players.length === 0) {

                delete rooms[roomCode];

            }

        }

    });

});


server.listen(PORT, () => {

    console.log(
        `Playroom server running on port ${PORT}`
    );

});
