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
// PLAYER NAME
// =========================

let playerName =
    localStorage.getItem(
        "playerName"
    );


if (!playerName) {

    playerName =
        prompt(
            "Enter your name:"
        );


    if (playerName) {

        playerName =
            playerName.trim();

        localStorage.setItem(
            "playerName",
            playerName
        );

    }
}


// =========================
// QUESTION COUNT
// =========================

let questionCount = 10;


const questionButtons =
    document.querySelectorAll(
        ".question-option"
    );


questionButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                questionButtons.forEach(
                    (item) => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );


                button.classList.add(
                    "active"
                );


                questionCount =
                    Number(
                        button.dataset.count
                    );

            }
        );

    }
);


// =========================
// CREATE ROOM
// =========================

function createRoom() {

    if (!playerName) {

        alert(
            "Please enter your name first."
        );

        window.location.href =
            "index.html";

        return;
    }


    const category =
        document
            .getElementById(
                "category"
            )
            .value;


    const difficulty =
        document
            .getElementById(
                "difficulty"
            )
            .value;


    localStorage.setItem(
        "gameType",
        "quiz"
    );


    localStorage.setItem(
        "quizCategory",
        category
    );


    localStorage.setItem(
        "quizDifficulty",
        difficulty
    );


    localStorage.setItem(
        "quizQuestionCount",
        questionCount
    );


    socket.emit(
        "createRoom",
        {

            playerId:
                playerId,

            playerName:
                playerName,

            gameType:
                "quiz"

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
// ERRORS
// =========================

socket.on(
    "errorMessage",
    (message) => {

        alert(message);

    }
);
