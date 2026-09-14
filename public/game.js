const socket = io();

const params = new URLSearchParams(window.location.search);

const roomCode = params.get("room");

let playerId = localStorage.getItem("playerId");
let playerName = localStorage.getItem("playerName");
let gameType = localStorage.getItem("gameType") || "quiz";

let currentTimeLimit = 15;
let currentTimeLeft = 15;
let timerInterval = null;

let hasAnswered = false;
let gameActive = false;

// Quiz
let currentQuestion = null;

// Bingo
let bingoCardData = [];
let bingoMarked = new Set();
let bingoCalledNumbers = [];

// Memory
let memoryCards = [];
let memoryFlipped = [];
let memoryMatched = new Set();
let memoryMyTurn = false;
let memoryLocked = false;


// ============================================================
// DOM
// ============================================================

const question = document.getElementById("question");
const questionNumber = document.getElementById("questionNumber");

const timer = document.getElementById("timer");
const timerProgress = document.getElementById("timerProgress");
const timerArea = document.getElementById("timerArea");

const answerMessage = document.getElementById("answerMessage");

const scoreboard = document.getElementById("scoreboard");

const resultsNavigation = document.getElementById("resultsNavigation");
const playAgainButton = document.getElementById("playAgainButton");

const quizGame = document.getElementById("quizGame");
const scrambleGame = document.getElementById("scrambleGame");
const puzzleGame = document.getElementById("puzzleGame");
const bingoGame = document.getElementById("bingoGame");
const memoryGame = document.getElementById("memoryGame");


// Quiz
const answerButtons = document.querySelectorAll(".answer");

// Scramble
const scrambledWord = document.getElementById("scrambledWord");
const scrambleHint = document.getElementById("scrambleHint");
const scrambleInput = document.getElementById("scrambleInput");
const scrambleSubmit = document.getElementById("scrambleSubmit");

// Puzzle
const puzzleQuestion = document.getElementById("puzzleQuestion");
const puzzleAnswers = document.querySelectorAll(".puzzle-answer");

// Bingo
const bingoCalledNumber = document.getElementById("bingoCalledNumber");
const bingoCard = document.getElementById("bingoCard");
const claimBingoButton = document.getElementById("claimBingoButton");
const bingoHistory = document.getElementById("bingoHistory");

// Memory
const memoryTurn = document.getElementById("memoryTurn");
const memoryInstruction = document.getElementById("memoryInstruction");
const memoryBoard = document.getElementById("memoryBoard");


// ============================================================
// BASIC VALIDATION
// ============================================================

if (!roomCode) {
    showError("No room code was provided.");
}

if (!playerId) {
    showError("Your player session could not be found.");
}


// ============================================================
// GAME MODE
// ============================================================

function showGameMode(type) {
    gameType = type || "quiz";

    if (quizGame) quizGame.style.display = "none";
    if (scrambleGame) scrambleGame.style.display = "none";
    if (puzzleGame) puzzleGame.style.display = "none";
    if (bingoGame) bingoGame.style.display = "none";
    if (memoryGame) memoryGame.style.display = "none";

    const titles = {
        quiz: "Quiz Arena",
        scramble: "Word Scramble",
        puzzle: "Puzzle Rush",
        bingo: "Bingo",
        memory: "Memory Match"
    };

    const target = {
        quiz: quizGame,
        scramble: scrambleGame,
        puzzle: puzzleGame,
        bingo: bingoGame,
        memory: memoryGame
    };

    if (target[gameType]) {
        target[gameType].style.display = "";
    }

    document.title = `${titles[gameType] || "Game Space"} | Game Space`;

    const eyebrow = document.getElementById("gameEyebrow");

    if (eyebrow) {
        eyebrow.textContent = titles[gameType] || "Game Space";
    }

    if (questionNumber) {
        questionNumber.textContent = "";
    }

    hideTimer();

    clearAnswerMessage();
}

showGameMode(gameType);


// ============================================================
// SOCKET CONNECTION
// ============================================================

socket.on("connect", () => {
    console.log("Connected to Game Space server.");

    socket.emit("gameReady", {
        roomCode,
        playerId
    });
});

socket.on("gameReadyConfirmed", (data) => {
    console.log("Game ready:", data);
});

socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
    showError("Connection lost. Trying to reconnect...");
});

socket.on("disconnect", () => {
    console.warn("Disconnected from server.");
    showError("Connection lost. Reconnecting...");
});


// ============================================================
// GAME STARTED
// ============================================================

socket.on("gameStarted", (data) => {
    console.log("Game started:", data);

    gameActive = true;

    if (data && data.gameType) {
        showGameMode(data.gameType);
    }

    if (data && data.settings) {
        currentTimeLimit =
            Number(data.settings.timePerQuestion) ||
            Number(data.settings.timeLimit) ||
            15;
    }

    if (resultsNavigation) {
        resultsNavigation.style.display = "none";
    }

    clearAnswerMessage();

    memoryLocked = false;
});

socket.on("gameStarting", (data) => {
    console.log("Game starting:", data);

    if (data && data.gameType) {
        showGameMode(data.gameType);
    }

    if (data && data.countdown) {
        showMessage(`Starting in ${data.countdown}...`);
    }
});


// ============================================================
// TIMER
// ============================================================

function startTimer(seconds) {
    stopTimer();

    currentTimeLimit = Number(seconds) || 15;
    currentTimeLeft = currentTimeLimit;

    if (timerArea) {
        timerArea.style.display = "";
    }

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        currentTimeLeft--;

        updateTimerDisplay();

        if (currentTimeLeft <= 0) {
            stopTimer();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function hideTimer() {
    stopTimer();

    if (timerArea) {
        timerArea.style.display = "none";
    }
}

function updateTimerDisplay() {
    if (timer) {
        timer.textContent = Math.max(0, currentTimeLeft);
    }

    if (timerProgress) {
        const percentage =
            currentTimeLimit > 0
                ? (currentTimeLeft / currentTimeLimit) * 100
                : 0;

        timerProgress.style.width = `${Math.max(0, percentage)}%`;
    }

    if (timer && currentTimeLeft <= 5 && currentTimeLeft > 0) {
        timer.classList.add("timer-warning");
    } else if (timer) {
        timer.classList.remove("timer-warning");
    }
}


// ============================================================
// MESSAGE HELPERS
// ============================================================

function showMessage(message, type = "") {
    if (!answerMessage) return;

    answerMessage.textContent = message;
    answerMessage.className = "answer-message";

    if (type) {
        answerMessage.classList.add(type);
    }
}

function clearAnswerMessage() {
    if (!answerMessage) return;

    answerMessage.textContent = "";
    answerMessage.className = "answer-message";
}

function showError(message) {
    showMessage(message, "error");
}


// ============================================================
// QUIZ ARENA
// ============================================================

socket.on("newQuestion", (data) => {
    console.log("New question:", data);

    gameType = "quiz";
    showGameMode("quiz");

    currentQuestion = data;
    hasAnswered = false;

    if (question) {
        question.textContent = data.question || "";
    }

    if (questionNumber) {
        if (data.questionNumber && data.totalQuestions) {
            questionNumber.textContent =
                `Question ${data.questionNumber} of ${data.totalQuestions}`;
        } else {
            questionNumber.textContent = "";
        }
    }

    answerButtons.forEach((button, index) => {
        button.disabled = false;
        button.classList.remove(
            "selected",
            "correct",
            "incorrect",
            "disabled"
        );

        if (data.answers && data.answers[index] !== undefined) {
            button.textContent = data.answers[index];
            button.style.display = "";
        } else {
            button.textContent = "";
            button.style.display = "none";
        }
    });

    clearAnswerMessage();

    const seconds =
        Number(data.timeLimit) ||
        Number(data.timeLeft) ||
        currentTimeLimit ||
        15;

    startTimer(seconds);
});

answerButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
        submitQuizAnswer(index);
    });
});

function submitQuizAnswer(index) {
    if (hasAnswered || !gameActive) return;

    hasAnswered = true;

    answerButtons.forEach((button) => {
        button.disabled = true;
    });

    answerButtons[index].classList.add("selected");

    socket.emit("submitAnswer", {
        roomCode,
        playerId,
        answerIndex: index
    });
}

socket.on("answerResult", (data) => {
    console.log("Answer result:", data);

    if (data.playerId && data.playerId !== playerId) {
        return;
    }

    if (data.correct) {
        showMessage(
            `Correct! +${data.points || 0} points`,
            "correct"
        );
    } else {
        showMessage(
            data.correctAnswer !== undefined
                ? `Not quite. The correct answer was ${data.correctAnswer}.`
                : "Not quite.",
            "incorrect"
        );
    }
});

socket.on("questionEnded", (data) => {
    stopTimer();

    answerButtons.forEach((button) => {
        button.disabled = true;
    });
});


// ============================================================
// WORD SCRAMBLE
// ============================================================

socket.on("newScramble", (data) => {
    console.log("New scramble:", data);

    gameType = "scramble";
    showGameMode("scramble");

    hasAnswered = false;

    if (scrambledWord) {
        scrambledWord.textContent = data.scrambled || "";
    }

    if (scrambleHint) {
        scrambleHint.textContent = data.hint
            ? `Hint: ${data.hint}`
            : "";
    }

    if (scrambleInput) {
        scrambleInput.value = "";
        scrambleInput.disabled = false;
        scrambleInput.focus();
    }

    if (scrambleSubmit) {
        scrambleSubmit.disabled = false;
    }

    clearAnswerMessage();

    startTimer(
        Number(data.timeLimit) ||
        Number(data.timeLeft) ||
        20
    );
});

function submitScrambleAnswer() {
    if (hasAnswered || !gameActive) return;

    if (!scrambleInput) return;

    const answer = scrambleInput.value.trim();

    if (!answer) {
        showMessage("Enter an answer first.", "error");
        return;
    }

    hasAnswered = true;

    scrambleInput.disabled = true;

    if (scrambleSubmit) {
        scrambleSubmit.disabled = true;
    }

    socket.emit("submitScramble", {
        roomCode,
        playerId,
        answer
    });
}

if (scrambleSubmit) {
    scrambleSubmit.addEventListener("click", submitScrambleAnswer);
}

if (scrambleInput) {
    scrambleInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            submitScrambleAnswer();
        }
    });
}

socket.on("scrambleResult", (data) => {
    console.log("Scramble result:", data);

    if (data.playerId && data.playerId !== playerId) {
        return;
    }

    if (data.correct) {
        showMessage(
            `Correct! +${data.points || 0} points`,
            "correct"
        );
    } else {
        showMessage(
            data.message || "That's not correct.",
            "incorrect"
        );
    }
});

socket.on("scrambleEnded", () => {
    stopTimer();

    if (scrambleInput) {
        scrambleInput.disabled = true;
    }

    if (scrambleSubmit) {
        scrambleSubmit.disabled = true;
    }
});


// ============================================================
// PUZZLE RUSH
// ============================================================

socket.on("newPuzzle", (data) => {
    console.log("New puzzle:", data);

    gameType = "puzzle";
    showGameMode("puzzle");

    hasAnswered = false;

    if (puzzleQuestion) {
        puzzleQuestion.textContent = data.question || "";
    }

    puzzleAnswers.forEach((button, index) => {
        button.disabled = false;
        button.classList.remove(
            "selected",
            "correct",
            "incorrect"
        );

        if (data.answers && data.answers[index] !== undefined) {
            button.textContent = data.answers[index];
            button.style.display = "";
        } else {
            button.textContent = "";
            button.style.display = "none";
        }
    });

    clearAnswerMessage();

    startTimer(
        Number(data.timeLimit) ||
        Number(data.timeLeft) ||
        20
    );
});

puzzleAnswers.forEach((button, index) => {
    button.addEventListener("click", () => {
        submitPuzzleAnswer(index);
    });
});

function submitPuzzleAnswer(index) {
    if (hasAnswered || !gameActive) return;

    hasAnswered = true;

    puzzleAnswers.forEach((button) => {
        button.disabled = true;
    });

    puzzleAnswers[index].classList.add("selected");

    socket.emit("submitPuzzle", {
        roomCode,
        playerId,
        answerIndex: index
    });
}

socket.on("puzzleResult", (data) => {
    console.log("Puzzle result:", data);

    if (data.playerId && data.playerId !== playerId) {
        return;
    }

    if (data.correct) {
        showMessage(
            `Correct! +${data.points || 0} points`,
            "correct"
        );
    } else {
        showMessage(
            data.message || "Incorrect.",
            "incorrect"
        );
    }
});

socket.on("puzzleEnded", () => {
    stopTimer();

    puzzleAnswers.forEach((button) => {
        button.disabled = true;
    });
});


// ============================================================
// BINGO
// ============================================================

socket.on("bingoCard", (data) => {
    console.log("Bingo card:", data);

    gameType = "bingo";
    showGameMode("bingo");

    bingoCardData = data.card || data || [];
    bingoMarked = new Set();

    renderBingoCard();

    if (claimBingoButton) {
        claimBingoButton.disabled = false;
    }
});

socket.on("bingoStarted", (data) => {
    console.log("Bingo started:", data);

    gameType = "bingo";
    showGameMode("bingo");

    bingoCalledNumbers = [];

    if (bingoCalledNumber) {
        bingoCalledNumber.textContent = "READY";
    }

    if (bingoHistory) {
        bingoHistory.innerHTML = "";
    }

    clearAnswerMessage();
});

socket.on("bingoNumberCalled", (data) => {
    console.log("Bingo number:", data);

    const number =
        data.number !== undefined
            ? data.number
            : data.calledNumber;

    if (number === undefined) return;

    bingoCalledNumbers.push(number);

    if (bingoCalledNumber) {
        bingoCalledNumber.textContent = number;
    }

    renderBingoHistory();

    // Automatically highlight numbers that have been called.
    markCalledBingoNumbers();
});

function renderBingoCard() {
    if (!bingoCard) return;

    bingoCard.innerHTML = "";

    let flatCard = bingoCardData;

    if (
        Array.isArray(bingoCardData) &&
        bingoCardData.length === 5 &&
        Array.isArray(bingoCardData[0])
    ) {
        flatCard = bingoCardData.flat();
    }

    if (!Array.isArray(flatCard)) return;

    flatCard.forEach((value, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "bingo-cell";
        button.dataset.index = index;
        button.dataset.number = value;

        if (index === 12 && String(value).toUpperCase() === "FREE") {
            button.textContent = "FREE";
            button.classList.add("free", "marked");
            bingoMarked.add(index);
        } else {
            button.textContent = value;

            button.addEventListener("click", () => {
                if (button.classList.contains("called")) {
                    button.classList.toggle("marked");

                    if (button.classList.contains("marked")) {
                        bingoMarked.add(index);
                    } else {
                        bingoMarked.delete(index);
                    }
                }
            });
        }

        bingoCard.appendChild(button);
    });

    markCalledBingoNumbers();
}

function markCalledBingoNumbers() {
    if (!bingoCard) return;

    const cells = bingoCard.querySelectorAll(".bingo-cell");

    cells.forEach((cell) => {
        const number = Number(cell.dataset.number);

        if (
            bingoCalledNumbers.some(
                (called) => Number(called) === number
            )
        ) {
            cell.classList.add("called");
        }
    });
}

function renderBingoHistory() {
    if (!bingoHistory) return;

    bingoHistory.innerHTML = "";

    bingoCalledNumbers
        .slice()
        .reverse()
        .slice(0, 12)
        .forEach((number) => {
            const item = document.createElement("span");

            item.className = "bingo-history-number";
            item.textContent = number;

            bingoHistory.appendChild(item);
        });
}

if (claimBingoButton) {
    claimBingoButton.addEventListener("click", () => {
        if (!gameActive) return;

        claimBingoButton.disabled = true;

        socket.emit("claimBingo", {
            roomCode,
            playerId
        });
    });
}

socket.on("bingoResult", (data) => {
    console.log("Bingo result:", data);

    if (data.playerId && data.playerId !== playerId) {
        return;
    }

    if (data.valid || data.correct || data.success) {
        showMessage(
            data.message || "BINGO! Your card is valid.",
            "correct"
        );
    } else {
        showMessage(
            data.message || "Not a winning card yet.",
            "incorrect"
        );

        if (claimBingoButton) {
            claimBingoButton.disabled = false;
        }
    }
});

socket.on("bingoWinner", (data) => {
    console.log("Bingo winner:", data);

    if (data.playerId === playerId) {
        showMessage(
            "BINGO! You won!",
            "correct"
        );
    } else {
        showMessage(
            `${data.playerName || "Another player"} got BINGO!`,
            "correct"
        );
    }

    if (claimBingoButton) {
        claimBingoButton.disabled = true;
    }
});


// ============================================================
// MEMORY MATCH
// ============================================================

socket.on("memoryStarted", (data) => {
    console.log("Memory game started:", data);

    gameType = "memory";
    showGameMode("memory");

    memoryCards = data.cards || data.board || [];
    memoryFlipped = [];
    memoryMatched = new Set();
    memoryLocked = false;

    renderMemoryBoard();

    if (memoryInstruction) {
        memoryInstruction.textContent =
            "Find matching pairs. Match a pair to keep your turn.";
    }
});

socket.on("memoryTurn", (data) => {
    console.log("Memory turn:", data);

    const activePlayerId =
        data.playerId ||
        data.currentPlayerId;

    memoryMyTurn = activePlayerId === playerId;

    if (memoryTurn) {
        if (memoryMyTurn) {
            memoryTurn.textContent = "Your turn";
        } else {
            memoryTurn.textContent =
                `${data.playerName || "Another player"}'s turn`;
        }
    }

    updateMemoryBoardState();
});

function renderMemoryBoard() {
    if (!memoryBoard) return;

    memoryBoard.innerHTML = "";

    memoryCards.forEach((card, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "memory-card";
        button.dataset.index = index;

        button.innerHTML = `
            <span class="memory-card-inner">
                <span class="memory-card-front">?</span>
                <span class="memory-card-back"></span>
            </span>
        `;

        button.addEventListener("click", () => {
            flipMemoryCard(index);
        });

        memoryBoard.appendChild(button);
    });

    updateMemoryBoardState();
}

function updateMemoryBoardState() {
    if (!memoryBoard) return;

    const cards = memoryBoard.querySelectorAll(".memory-card");

    cards.forEach((card, index) => {
        const isMatched = memoryMatched.has(index);
        const isFlipped = memoryFlipped.includes(index);

        card.classList.toggle("matched", isMatched);
        card.classList.toggle("flipped", isFlipped);

        card.disabled =
            memoryLocked ||
            !memoryMyTurn ||
            isMatched ||
            isFlipped;
    });
}

function flipMemoryCard(index) {
    if (!memoryMyTurn || memoryLocked) return;

    if (memoryMatched.has(index)) return;

    if (memoryFlipped.includes(index)) return;

    if (memoryFlipped.length >= 2) return;

    memoryLocked = true;

    const cardElement =
        memoryBoard?.querySelector(
            `[data-index="${index}"]`
        );

    if (cardElement) {
        cardElement.classList.add("flipped");
    }

    socket.emit("memoryFlip", {
        roomCode,
        playerId,
        cardIndex: index
    });
}

socket.on("memoryCardFlipped", (data) => {
    console.log("Memory card flipped:", data);

    const index =
        data.cardIndex !== undefined
            ? data.cardIndex
            : data.index;

    if (index === undefined) return;

    const symbol =
        data.symbol !== undefined
            ? data.symbol
            : data.value;

    if (!memoryFlipped.includes(index)) {
        memoryFlipped.push(index);
    }

    const cardElement =
        memoryBoard?.querySelector(
            `[data-index="${index}"]`
        );

    if (cardElement) {
        cardElement.classList.add("flipped");

        const back =
            cardElement.querySelector(".memory-card-back");

        if (back) {
            back.textContent = symbol ?? "";
        }
    }

    updateMemoryBoardState();
});

socket.on("memoryMatch", (data) => {
    console.log("Memory match:", data);

    const indexes =
        data.cardIndexes ||
        data.cards ||
        memoryFlipped;

    indexes.forEach((index) => {
        memoryMatched.add(Number(index));
    });

    memoryFlipped = memoryFlipped.filter(
        (index) => !indexes.includes(index)
    );

    memoryLocked = false;

    showMessage(
        data.playerId === playerId
            ? `Match! +${data.points || 0} points`
            : `${data.playerName || "A player"} found a match.`,
        "correct"
    );

    updateMemoryBoardState();
});

socket.on("memoryMismatch", (data) => {
    console.log("Memory mismatch:", data);

    const indexes =
        data.cardIndexes ||
        data.cards ||
        [...memoryFlipped];

    memoryLocked = true;

    setTimeout(() => {
        indexes.forEach((index) => {
            const cardElement =
                memoryBoard?.querySelector(
                    `[data-index="${index}"]`
                );

            if (cardElement) {
                cardElement.classList.remove("flipped");

                const back =
                    cardElement.querySelector(
                        ".memory-card-back"
                    );

                if (back) {
                    back.textContent = "";
                }
            }
        });

        memoryFlipped = [];

        memoryLocked = false;

        updateMemoryBoardState();
    }, 900);

    showMessage("No match. Keep trying!", "incorrect");
});


// ============================================================
// SCOREBOARD
// ============================================================

socket.on("scoreUpdate", (players) => {
    renderScoreboard(players);
});

function renderScoreboard(players) {
    if (!scoreboard) return;

    scoreboard.innerHTML = "";

    if (!Array.isArray(players)) return;

    const sortedPlayers = [...players].sort(
        (a, b) => (b.score || 0) - (a.score || 0)
    );

    sortedPlayers.forEach((player, index) => {
        const row = document.createElement("div");

        row.className = "score-row";

        if (player.playerId === playerId) {
            row.classList.add("current-player");
        }

        const position = index + 1;

        row.innerHTML = `
            <div class="score-player">
                <span class="score-position">${position}</span>
                <span class="score-name">
                    ${escapeHtml(player.name || "Player")}
                </span>
            </div>
            <strong class="score-value">
                ${Number(player.score || 0)}
            </strong>
        `;

        scoreboard.appendChild(row);
    });
}


// ============================================================
// GAME FINISHED
// ============================================================

socket.on("gameFinished", (data) => {
    console.log("Game finished:", data);

    gameActive = false;

    stopTimer();

    hideTimer();

    answerButtons.forEach((button) => {
        button.disabled = true;
    });

    puzzleAnswers.forEach((button) => {
        button.disabled = true;
    });

    if (scrambleInput) {
        scrambleInput.disabled = true;
    }

    if (scrambleSubmit) {
        scrambleSubmit.disabled = true;
    }

    if (claimBingoButton) {
        claimBingoButton.disabled = true;
    }

    memoryLocked = true;

    updateMemoryBoardState();

    if (resultsNavigation) {
        resultsNavigation.style.display = "";
    }

    const finalPlayers =
        data.players ||
        data.scores ||
        [];

    if (Array.isArray(finalPlayers) && finalPlayers.length) {
        renderScoreboard(finalPlayers);
    }

    const winner =
        data.winner ||
        (Array.isArray(finalPlayers)
            ? finalPlayers[0]
            : null);

    if (winner) {
        if (winner.playerId === playerId) {
            showMessage("You won! 🎉", "correct");
        } else {
            showMessage(
                `${winner.name || "A player"} won!`,
                "correct"
            );
        }
    } else {
        showMessage("Game over!");
    }
});


// ============================================================
// PLAY AGAIN / REMATCH
// ============================================================

if (playAgainButton) {
    playAgainButton.addEventListener("click", () => {
        playAgainButton.disabled = true;

        socket.emit("rematch", {
            roomCode,
            playerId
        });
    });
}

socket.on("rematchStarted", () => {
    window.location.href =
        `/lobby.html?room=${encodeURIComponent(roomCode)}`;
});


// ============================================================
// ROOM UPDATE
// ============================================================

socket.on("roomUpdate", (data) => {
    console.log("Room update:", data);

    if (data.gameType) {
        gameType = data.gameType;
    }
});


// ============================================================
// ERROR HANDLING
// ============================================================

socket.on("errorMessage", (message) => {
    console.error("Server error:", message);

    showError(message);

    if (playAgainButton) {
        playAgainButton.disabled = false;
    }

    if (claimBingoButton && gameType === "bingo") {
        claimBingoButton.disabled = false;
    }
});


// ============================================================
// UTILITY
// ============================================================

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}


// ============================================================
// PAGE CLEANUP
// ============================================================

window.addEventListener("beforeunload", () => {
    stopTimer();
});
