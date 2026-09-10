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
// GET PLAYER
// =========================

const playerId =
    localStorage.getItem(
        "playerId"
    );


// =========================
// GAME VARIABLES
// =========================

let currentQuestion = null;

let timerInterval = null;

let hasAnswered = false;


// =========================
// ANSWER BUTTONS
// =========================

const answerButtons =
    document.querySelectorAll(
        ".answer"
    );


answerButtons.forEach(
    (button) => {

        button.addEventListener(
            "click",
            () => {

                const answerIndex =
                    Number(
                        button.dataset.index
                    );


                submitAnswer(
                    answerIndex
                );

            }
        );

    }
);


// =========================
// SUBMIT ANSWER
// =========================

function submitAnswer(
    answerIndex
) {

    if (
        hasAnswered ||
        !currentQuestion
    ) {

        return;

    }


    hasAnswered = true;


    // Disable all buttons

    answerButtons.forEach(
        (button) => {

            button.disabled = true;

        }
    );


    socket.emit(
        "submitAnswer",
        {

            roomCode:
                roomCode,

            playerId:
                playerId,

            answerIndex:
                answerIndex

        }
    );

}


// =========================
// NEW QUESTION
// =========================

socket.on(
    "newQuestion",
    (question) => {

        currentQuestion =
            question;


        hasAnswered =
            false;


        document.getElementById(
            "questionNumber"
        ).textContent =
            `Question ${question.number}`;


        document.getElementById(
            "question"
        ).textContent =
            question.question;


        answerButtons.forEach(
            (button, index) => {

                button.disabled =
                    false;

                button.textContent =
                    question.answers[index];

            }
        );


        document.getElementById(
            "answerMessage"
        ).classList.add(
            "hidden"
        );


        startTimer(
            question.timeLimit
        );

    }
);


// =========================
// TIMER
// =========================

function startTimer(
    seconds
) {

    clearInterval(
        timerInterval
    );


    let timeLeft =
        seconds;


    const timer =
        document.getElementById(
            "timer"
        );


    timer.textContent =
        timeLeft;


    timerInterval =
        setInterval(
            () => {

                timeLeft--;


                timer.textContent =
                    timeLeft;


                if (
                    timeLeft <= 0
                ) {

                    clearInterval(
                        timerInterval
                    );


                    if (
                        !hasAnswered
                    ) {

                        hasAnswered =
                            true;


                        answerButtons.forEach(
                            (button) => {

                                button.disabled =
                                    true;

                            }
                        );


                        document.getElementById(
                            "answerMessage"
                        ).textContent =
                            "Time's up!";


                        document.getElementById(
                            "answerMessage"
                        ).classList.remove(
                            "hidden"
                        );

                    }

                }

            },
            1000
        );

}


// =========================
// ANSWER RESULT
// =========================

socket.on(
    "answerResult",
    ({ correct, points }) => {

        const message =
            document.getElementById(
                "answerMessage"
            );


        if (correct) {

            message.textContent =
                `Correct! +${points} points 🎉`;

        }

        else {

            message.textContent =
                "Not quite!";

        }


        message.classList.remove(
            "hidden"
        );

    }
);


// =========================
// SCOREBOARD
// =========================

socket.on(
    "scoreUpdate",
    (players) => {

        const scoreboard =
            document.getElementById(
                "scoreboard"
            );


        scoreboard.innerHTML =
            "";


        players
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .forEach(
                (player, index) => {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "player";


                    row.textContent =
                        `${index + 1}. ${player.name} — ${player.score}`;


                    scoreboard.appendChild(
                        row
                    );

                }
            );

    }
);


// =========================
// GAME FINISHED
// =========================

socket.on(
    "gameFinished",
    (players) => {

        clearInterval(
            timerInterval
        );


        const question =
            document.getElementById(
                "question"
            );


        question.textContent =
            "🏆 Game Over!";


        document.getElementById(
            "questionNumber"
        ).textContent =
            "Final Results";


        document.getElementById(
            "timer"
        ).textContent =
            "";


        answerButtons.forEach(
            (button) => {

                button.style.display =
                    "none";

            }
        );


        const scoreboard =
            document.getElementById(
                "scoreboard"
            );


        scoreboard.innerHTML =
            "";


        players
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .forEach(
                (player, index) => {

                    const row =
                        document.createElement(
                            "div"
                        );


                    row.className =
                        "player";


                    row.textContent =
                        `${index + 1}. ${player.name} — ${player.score} points`;


                    scoreboard.appendChild(
                        row
                    );

                }
            );

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
