```javascript
const socket = io();


// =========================================================
// GAME TYPE
// =========================================================

const params = new URLSearchParams(
    window.location.search
);

const gameType =
    params.get("game") || "quiz";


// =========================================================
// PLAYER ID
// =========================================================

function getPlayerId() {

    let playerId =
        localStorage.getItem(
            "playerId"
        );

    if (!playerId) {

        if (
            window.crypto &&
            typeof crypto.randomUUID === "function"
        ) {

            playerId =
                crypto.randomUUID();

        } else {

            playerId =
                "player-" +
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .substring(2, 10);
        }

        localStorage.setItem(
            "playerId",
            playerId
        );
    }

    return playerId;
}


const playerId =
    getPlayerId();


// =========================================================
// GAME INFORMATION
// =========================================================

const gameInfo = {

    quiz: {

        title: "Quiz Arena",

        icon: "🎯",

        description:
            "Set up your quiz before inviting everyone in."

    },

    puzzle: {

        title: "Puzzle Rush",

        icon: "🧩",

        description:
            "Set up your challenge before inviting everyone in."

    },

    bingo: {

        title: "Bingo",

        icon: "🎱",

        description:
            "Get your card ready and invite everyone in."

    },

    memory: {

        title: "Memory Match",

        icon: "🧠",

        description:
            "Set up your memory challenge before inviting everyone in."

    },

    scramble: {

        title: "Word Scramble",

        icon: "🔤",

        description:
            "Set up your word challenge before inviting everyone in."

    }

};


const selectedGame =
    gameInfo[gameType] ||
    gameInfo.quiz;


// =========================================================
// DOM ELEMENTS
// =========================================================

const setupIcon =
    document.getElementById(
        "setupIcon"
    );

const setupTitle =
    document.getElementById(
        "setupTitle"
    );

const setupDescription =
    document.getElementById(
        "setupDescription"
    );

const playerNameInput =
    document.getElementById(
        "playerName"
    );

const quizSettings =
    document.getElementById(
        "quizSettings"
    );

const generalSettings =
    document.getElementById(
        "generalSettings"
    );

const gameDifficulty =
    document.getElementById(
        "gameDifficulty"
    );

const createRoomButton =
    document.getElementById(
        "createRoomButton"
    );

const setupError =
    document.getElementById(
        "setupError"
    );


// =========================================================
// SETUP PAGE
// =========================================================

function configureSetupPage() {

    setupIcon.textContent =
        selectedGame.icon;

    setupTitle.textContent =
        selectedGame.title;

    setupDescription.textContent =
        selectedGame.description;


    document.title =
        `${selectedGame.title} Setup | Game Space`;


    if (gameType === "quiz") {

        quizSettings.style.display =
            "block";

        generalSettings.style.display =
            "none";

    } else {

        quizSettings.style.display =
            "none";

        generalSettings.style.display =
            "block";
    }


    /*
        Bingo does not need difficulty
        or rounds, so hide those controls.
    */

    if (gameType === "bingo") {

        const difficultyGroup =
            gameDifficulty
                .closest(".form-group");

        const roundSettings =
            document.getElementById(
                "roundSettings"
            );

        if (difficultyGroup) {

            difficultyGroup.style.display =
                "none";
        }

        if (roundSettings) {

            roundSettings.style.display =
                "none";
        }
    }


    /*
        Memory uses difficulty but does
        not need a round selector.
    */

    if (gameType === "memory") {

        const roundSettings =
            document.getElementById(
                "roundSettings"
            );

        if (roundSettings) {

            roundSettings.style.display =
                "none";
        }
    }
}


configureSetupPage();


// =========================================================
// PLAYER NAME
// =========================================================

const savedPlayerName =
    localStorage.getItem(
        "playerName"
    );


if (savedPlayerName) {

    playerNameInput.value =
        savedPlayerName;
}


// =========================================================
// QUIZ QUESTION COUNT
// =========================================================

let questionCount = 10;


const questionButtons =
    document.querySelectorAll(
        "#quizSettings .question-option"
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


// =========================================================
// NON-QUIZ ROUND COUNT
// =========================================================

let roundCount = 10;


const roundButtons =
    document.querySelectorAll(
        "#roundSettings .question-option"
    );


roundButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                roundButtons.forEach(
                    (item) => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                roundCount =
                    Number(
                        button.dataset.rounds
                    );
            }
        );

    }
);


// =========================================================
// NAME VALIDATION
// =========================================================

function getPlayerName() {

    const name =
        playerNameInput.value.trim();


    if (!name) {

        showError(
            "Please enter your name."
        );

        playerNameInput.focus();

        return null;
    }


    if (name.length < 2) {

        showError(
            "Your name must be at least 2 characters."
        );

        playerNameInput.focus();

        return null;
    }


    if (name.length > 20) {

        showError(
            "Your name must be 20 characters or less."
        );

        playerNameInput.focus();

        return null;
    }


    return name;
}


// =========================================================
// ERROR MESSAGE
// =========================================================

function showError(message) {

    setupError.textContent =
        message;

    setupError.classList.add(
        "error"
    );


    setTimeout(
        () => {

            setupError.textContent = "";

            setupError.classList.remove(
                "error"
            );

        },
        3500
    );
}


// =========================================================
// CREATE ROOM
// =========================================================

function createRoom() {

    const name =
        getPlayerName();


    if (!name) {

        return;
    }


    /*
        Save the name immediately.

        This means the same name will be
        available across Game Space.
    */

    localStorage.setItem(
        "playerName",
        name
    );


    let settings = {};



    // =====================================================
    // QUIZ SETTINGS
    // =====================================================

    if (gameType === "quiz") {

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


        settings = {

            category:
                category,

            difficulty:
                difficulty,

            questionCount:
                questionCount

        };


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

    }



    // =====================================================
    // PUZZLE RUSH
    // =====================================================

    else if (gameType === "puzzle") {

        settings = {

            difficulty:
                gameDifficulty.value,

            roundCount:
                roundCount

        };

    }



    // =====================================================
    // WORD SCRAMBLE
    // =====================================================

    else if (gameType === "scramble") {

        settings = {

            difficulty:
                gameDifficulty.value,

            roundCount:
                roundCount

        };

    }



    // =====================================================
    // MEMORY MATCH
    // =====================================================

    else if (gameType === "memory") {

        settings = {

            difficulty:
                gameDifficulty.value

        };

    }



    // =====================================================
    // BINGO
    // =====================================================

    else if (gameType === "bingo") {

        settings = {};

    }


    // =====================================================
    // SAVE GAME TYPE
    // =====================================================

    localStorage.setItem(
        "gameType",
        gameType
    );


    // =====================================================
    // DISABLE BUTTON
    // =====================================================

    createRoomButton.disabled =
        true;

    createRoomButton.textContent =
        "Creating Room...";


    // =====================================================
    // CREATE ROOM
    // =====================================================

    socket.emit(
        "createRoom",
        {

            playerId:
                playerId,

            playerName:
                name,

            gameType:
                gameType,

            settings:
                settings

        }
    );
}


// =========================================================
// CREATE BUTTON
// =========================================================

createRoomButton.addEventListener(
    "click",
    createRoom
);


// =========================================================
// ENTER KEY
// =========================================================

playerNameInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            createRoom();
        }

    }
);


// =========================================================
// ROOM CREATED
// =========================================================

socket.on(
    "roomCreated",
    ({
        roomCode,
        gameType: createdGameType,
        playerId: returnedPlayerId
    }) => {

        localStorage.setItem(
            "roomCode",
            roomCode
        );


        localStorage.setItem(
            "gameType",
            createdGameType
        );


        localStorage.setItem(
            "playerId",
            returnedPlayerId
        );


        window.location.href =
            `/lobby.html?room=${roomCode}`;

    }
);


// =========================================================
// ERRORS
// =========================================================

socket.on(
    "errorMessage",
    (message) => {

        showError(
            message
        );


        createRoomButton.disabled =
            false;

        createRoomButton.textContent =
            "Create Room";

    }
);
```
