// ========================================
// GAME SPACE
// GAME SETUP
// ========================================

const socket = io();


// ========================================
// READ GAME TYPE FROM URL
// ========================================

const params = new URLSearchParams(
    window.location.search
);

const requestedGame =
    (params.get("game") || "quiz").toLowerCase();


// Only allow games that actually exist
const validGames = [
    "quiz",
    "puzzle",
    "bingo",
    "memory",
    "scramble"
];

const gameType =
    validGames.includes(requestedGame)
        ? requestedGame
        : "quiz";


// ========================================
// PLAYER ID
// ========================================

function getPlayerId() {

    let playerId =
        localStorage.getItem("playerId");

    if (!playerId) {

        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {

            playerId =
                window.crypto.randomUUID();

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


// ========================================
// GAME INFORMATION
// ========================================

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
    gameInfo[gameType];


// ========================================
// DOM ELEMENTS
// ========================================

const setupIcon =
    document.getElementById("setupIcon");

const setupTitle =
    document.getElementById("setupTitle");

const setupDescription =
    document.getElementById("setupDescription");

const playerNameInput =
    document.getElementById("playerName");

const quizSettings =
    document.getElementById("quizSettings");

const generalSettings =
    document.getElementById("generalSettings");

const gameDifficulty =
    document.getElementById("gameDifficulty");

const createRoomButton =
    document.getElementById("createRoomButton");

const setupError =
    document.getElementById("setupError");


// ========================================
// INITIAL STATE
// ========================================

let questionCount = 10;

let roundCount = 10;

let creatingRoom = false;


// ========================================
// CONFIGURE PAGE
// ========================================

function configureSetupPage() {

    if (setupIcon) {

        setupIcon.textContent =
            selectedGame.icon;
    }


    if (setupTitle) {

        setupTitle.textContent =
            selectedGame.title;
    }


    if (setupDescription) {

        setupDescription.textContent =
            selectedGame.description;
    }


    document.title =
        `${selectedGame.title} Setup | Game Space`;


    // ------------------------------------
    // QUIZ
    // ------------------------------------

    if (gameType === "quiz") {

        if (quizSettings) {

            quizSettings.style.display =
                "block";
        }


        if (generalSettings) {

            generalSettings.style.display =
                "none";
        }

        return;
    }


    // ------------------------------------
    // OTHER GAMES
    // ------------------------------------

    if (quizSettings) {

        quizSettings.style.display =
            "none";
    }


    if (generalSettings) {

        generalSettings.style.display =
            "block";
    }


    const difficultyGroup =
        gameDifficulty
            ? gameDifficulty.closest(".form-group")
            : null;

    const roundSettings =
        document.getElementById(
            "roundSettings"
        );


    // ------------------------------------
    // BINGO
    // ------------------------------------

    if (gameType === "bingo") {

        if (difficultyGroup) {

            difficultyGroup.style.display =
                "none";
        }


        if (roundSettings) {

            roundSettings.style.display =
                "none";
        }

        return;
    }


    // ------------------------------------
    // MEMORY
    // ------------------------------------

    if (gameType === "memory") {

        if (difficultyGroup) {

            difficultyGroup.style.display =
                "block";
        }


        if (roundSettings) {

            roundSettings.style.display =
                "none";
        }

        return;
    }


    // ------------------------------------
    // PUZZLE / SCRAMBLE
    // ------------------------------------

    if (difficultyGroup) {

        difficultyGroup.style.display =
            "block";
    }


    if (roundSettings) {

        roundSettings.style.display =
            "block";
    }
}


configureSetupPage();


// ========================================
// RESTORE PLAYER NAME
// ========================================

const savedPlayerName =
    localStorage.getItem("playerName");


if (
    savedPlayerName &&
    playerNameInput
) {

    playerNameInput.value =
        savedPlayerName;
}


// ========================================
// RESTORE QUIZ SETTINGS
// ========================================

const savedQuestionCount =
    Number(
        localStorage.getItem(
            "quizQuestionCount"
        )
    );


if (
    savedQuestionCount >= 5 &&
    savedQuestionCount <= 20
) {

    questionCount =
        savedQuestionCount;
}


// ========================================
// SELECT QUIZ QUESTION BUTTON
// ========================================

const questionButtons =
    document.querySelectorAll(
        "#quizSettings .question-option"
    );


function updateQuestionButtons() {

    questionButtons.forEach(
        (button) => {

            const count =
                Number(
                    button.dataset.count
                );


            button.classList.toggle(
                "active",
                count === questionCount
            );
        }
    );
}


questionButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            (event) => {

                event.preventDefault();


                const selectedCount =
                    Number(
                        button.dataset.count
                    );


                if (
                    !Number.isFinite(
                        selectedCount
                    )
                ) {

                    return;
                }


                questionCount =
                    selectedCount;


                updateQuestionButtons();
            }
        );
    }
);


updateQuestionButtons();


// ========================================
// SELECT NON-QUIZ ROUND BUTTON
// ========================================

const roundButtons =
    document.querySelectorAll(
        "#roundSettings .question-option"
    );


function updateRoundButtons() {

    roundButtons.forEach(
        (button) => {

            const rounds =
                Number(
                    button.dataset.rounds
                );


            button.classList.toggle(
                "active",
                rounds === roundCount
            );
        }
    );
}


roundButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            (event) => {

                event.preventDefault();


                const selectedRounds =
                    Number(
                        button.dataset.rounds
                    );


                if (
                    !Number.isFinite(
                        selectedRounds
                    )
                ) {

                    return;
                }


                roundCount =
                    selectedRounds;


                updateRoundButtons();
            }
        );
    }
);


updateRoundButtons();


// ========================================
// ERROR MESSAGE
// ========================================

function showError(message) {

    if (!setupError) {
        alert(message);
        return;
    }


    setupError.textContent =
        message;


    setupError.classList.add(
        "error"
    );
}


// ========================================
// CLEAR ERROR
// ========================================

function clearError() {

    if (!setupError) {
        return;
    }


    setupError.textContent = "";

    setupError.classList.remove(
        "error"
    );
}


// ========================================
// GET PLAYER NAME
// ========================================

function getPlayerName() {

    if (!playerNameInput) {

        showError(
            "Player name field could not be found."
        );

        return null;
    }


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


// ========================================
// BUILD GAME SETTINGS
// ========================================

function buildGameSettings() {

    // ------------------------------------
    // QUIZ
    // ------------------------------------

    if (gameType === "quiz") {

        const categoryElement =
            document.getElementById(
                "category"
            );

        const difficultyElement =
            document.getElementById(
                "difficulty"
            );


        const category =
            categoryElement
                ? categoryElement.value
                : "random";


        const difficulty =
            difficultyElement
                ? difficultyElement.value
                : "mixed";


        return {

            category:
                category,

            difficulty:
                difficulty,

            questionCount:
                questionCount
        };
    }


    // ------------------------------------
    // BINGO
    // ------------------------------------

    if (gameType === "bingo") {

        return {};
    }


    // ------------------------------------
    // MEMORY
    // ------------------------------------

    if (gameType === "memory") {

        return {

            difficulty:
                gameDifficulty
                    ? gameDifficulty.value
                    : "medium"
        };
    }


    // ------------------------------------
    // PUZZLE
    // ------------------------------------

    if (gameType === "puzzle") {

        return {

            difficulty:
                gameDifficulty
                    ? gameDifficulty.value
                    : "medium",

            roundCount:
                roundCount
        };
    }


    // ------------------------------------
    // SCRAMBLE
    // ------------------------------------

    if (gameType === "scramble") {

        return {

            difficulty:
                gameDifficulty
                    ? gameDifficulty.value
                    : "medium",

            roundCount:
                roundCount
        };
    }


    return {};
}


// ========================================
// CREATE ROOM
// ========================================

function createRoom() {

    if (creatingRoom) {
        return;
    }


    clearError();


    const name =
        getPlayerName();


    if (!name) {
        return;
    }


    const settings =
        buildGameSettings();


    // Save player information
    localStorage.setItem(
        "playerName",
        name
    );


    localStorage.setItem(
        "gameType",
        gameType
    );


    // Save quiz preferences
    if (gameType === "quiz") {

        localStorage.setItem(
            "quizCategory",
            settings.category
        );


        localStorage.setItem(
            "quizDifficulty",
            settings.difficulty
        );


        localStorage.setItem(
            "quizQuestionCount",
            settings.questionCount
        );
    }


    // Make sure Socket.IO is connected
    if (!socket.connected) {

        showError(
            "Connecting to Game Space... Please try again in a moment."
        );

        return;
    }


    creatingRoom =
        true;


    if (createRoomButton) {

        createRoomButton.disabled =
            true;

        createRoomButton.textContent =
            "Creating Room...";
    }


    console.log(
        "Creating Game Space room:",
        {
            playerId,
            playerName: name,
            gameType,
            settings
        }
    );


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


// ========================================
// CREATE BUTTON
// ========================================

if (createRoomButton) {

    createRoomButton.addEventListener(
        "click",
        createRoom
    );
}


// ========================================
// ENTER KEY
// ========================================

if (playerNameInput) {

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
}


// ========================================
// ROOM CREATED
// ========================================

socket.on(
    "roomCreated",
    (data) => {

        console.log(
            "Room created:",
            data
        );


        if (!data) {

            showError(
                "The server returned an invalid room."
            );

            creatingRoom = false;

            if (createRoomButton) {

                createRoomButton.disabled =
                    false;

                createRoomButton.textContent =
                    "Create Room";
            }

            return;
        }


        const roomCode =
            data.roomCode;


        const createdGameType =
            data.gameType || gameType;


        const returnedPlayerId =
            data.playerId || playerId;


        if (!roomCode) {

            showError(
                "The room was created, but no room code was returned."
            );

            creatingRoom = false;

            if (createRoomButton) {

                createRoomButton.disabled =
                    false;

                createRoomButton.textContent =
                    "Create Room";
            }

            return;
        }


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


        // Go to the existing lobby.
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

        console.error(
            "Game Space server error:",
            message
        );


        showError(
            message ||
            "Something went wrong while creating the room."
        );


        creatingRoom =
            false;


        if (createRoomButton) {

            createRoomButton.disabled =
                false;

            createRoomButton.textContent =
                "Create Room";
        }
    }
);


// ========================================
// CONNECTION ERROR
// ========================================

socket.on(
    "connect_error",
    (error) => {

        console.error(
            "Game Space connection error:",
            error
        );


        if (creatingRoom) {

            creatingRoom =
                false;


            if (createRoomButton) {

                createRoomButton.disabled =
                    false;

                createRoomButton.textContent =
                    "Create Room";
            }
        }


        showError(
            "Could not connect to the Game Space server."
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
            "Connected to Game Space:",
            socket.id
        );
    }
);
