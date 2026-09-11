const socket = io();


/*
|--------------------------------------------------------------------------
| URL / PLAYER INFORMATION
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

const gameType =
    localStorage.getItem(
        "gameType"
    ) || "quiz";


/*
|--------------------------------------------------------------------------
| GAME STATE
|--------------------------------------------------------------------------
*/

let currentQuestion = null;

let timerInterval = null;

let hasAnswered = false;

let currentTimeLimit = 15;

let currentTimeLeft = 15;


/*
|--------------------------------------------------------------------------
| ELEMENTS
|--------------------------------------------------------------------------
*/

const questionElement =
    document.getElementById(
        "question"
    );

const questionNumberElement =
    document.getElementById(
        "questionNumber"
    );

const timerElement =
    document.getElementById(
        "timer"
    );

const timerProgress =
    document.getElementById(
        "timerProgress"
    );

const answerMessage =
    document.getElementById(
        "answerMessage"
    );

const scoreboard =
    document.getElementById(
        "scoreboard"
    );

const resultsNavigation =
    document.getElementById(
        "resultsNavigation"
    );

const playAgainButton =
    document.getElementById(
        "playAgainButton"
    );

const answerButtons =
    document.querySelectorAll(
        ".answer"
    );


/*
|--------------------------------------------------------------------------
| GAME READY
|--------------------------------------------------------------------------
*/

socket.on(
    "connect",
    () => {

        console.log(
            "Connected to Game Space:",
            socket.id
        );


        socket.emit(
            "gameReady",
            {
                roomCode:
                    roomCode,

                playerId:
                    playerId
            }
        );

    }
);


socket.on(
    "gameReadyConfirmed",
    () => {

        console.log(
            "Game page is ready."
        );

    }
);


/*
|--------------------------------------------------------------------------
| ANSWER BUTTONS
|--------------------------------------------------------------------------
*/

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
                    answerIndex,
                    button
                );

            }
        );

    }
);


/*
|--------------------------------------------------------------------------
| SUBMIT ANSWER
|--------------------------------------------------------------------------
*/

function submitAnswer(
    answerIndex,
    selectedButton
) {

    if (
        hasAnswered ||
        !currentQuestion
    ) {
        return;
    }


    hasAnswered =
        true;


    answerButtons.forEach(
        (button) => {

            button.disabled =
                true;

        }
    );


    selectedButton.classList.add(
        "selected-answer"
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


/*
|--------------------------------------------------------------------------
| NEW QUESTION
|--------------------------------------------------------------------------
*/

socket.on(
    "newQuestion",
    (question) => {

        currentQuestion =
            question;

        hasAnswered =
            false;


        currentTimeLimit =
            question.timeLimit;

        currentTimeLeft =
            question.timeLimit;


        /*
        |--------------------------------------------------------------------------
        | RESET ANSWERS
        |--------------------------------------------------------------------------
        */

        answerButtons.forEach(
            (button) => {

                button.disabled =
                    false;

                button.classList.remove(
                    "selected-answer"
                );

                button.classList.remove(
                    "correct-answer"
                );

                button.classList.remove(
                    "wrong-answer"
                );

                button.style.display =
                    "flex";

            }
        );


        answerMessage.classList.add(
            "hidden"
        );


        /*
        |--------------------------------------------------------------------------
        | QUESTION NUMBER
        |--------------------------------------------------------------------------
        */

        questionNumberElement.textContent =
            `Question ${question.number} of ${question.total}`;


        /*
        |--------------------------------------------------------------------------
        | QUESTION ANIMATION
        |--------------------------------------------------------------------------
        */

        questionElement.classList.remove(
            "question-changing"
        );

        void questionElement.offsetWidth;

        questionElement.classList.add(
            "question-changing"
        );


        questionElement.textContent =
            question.question;


        /*
        |--------------------------------------------------------------------------
        | ANSWER OPTIONS
        |--------------------------------------------------------------------------
        */

        answerButtons.forEach(
            (button, index) => {

                button.textContent =
                    question.answers[index];

                button.classList.remove(
                    "answer-changing"
                );

                void button.offsetWidth;

                button.classList.add(
                    "answer-changing"
                );

                button.style.animationDelay =
                    `${index * 0.06}s`;

            }
        );


        /*
        |--------------------------------------------------------------------------
        | TIMER
        |--------------------------------------------------------------------------
        */

        startTimer(
            question.timeLimit
        );

    }
);


/*
|--------------------------------------------------------------------------
| TIMER
|--------------------------------------------------------------------------
*/

function startTimer(
    seconds
) {

    clearInterval(
        timerInterval
    );


    let timeLeft =
        seconds;


    currentTimeLimit =
        seconds;

    currentTimeLeft =
        seconds;


    timerElement.textContent =
        timeLeft;


    timerElement.classList.remove(
        "timer-warning"
    );


    if (timerProgress) {

        timerProgress.style.transition =
            "none";

        timerProgress.style.width =
            "100%";


        void timerProgress.offsetWidth;


        timerProgress.style.transition =
            `width ${seconds}s linear`;

        timerProgress.style.width =
            "0%";

    }


    timerInterval =
        setInterval(
            () => {

                timeLeft--;

                currentTimeLeft =
                    timeLeft;


                timerElement.textContent =
                    Math.max(
                        0,
                        timeLeft
                    );


                if (
                    timeLeft <= 5 &&
                    timeLeft > 0
                ) {

                    timerElement.classList.add(
                        "timer-warning"
                    );

                } else {

                    timerElement.classList.remove(
                        "timer-warning"
                    );

                }


                if (
                    timeLeft <= 0
                ) {

                    clearInterval(
                        timerInterval
                    );


                    timerElement.classList.remove(
                        "timer-warning"
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


                        showAnswerMessage(
                            "Time's up!",
                            "timeout"
                        );

                    }

                }

            },
            1000
        );

}


/*
|--------------------------------------------------------------------------
| ANSWER RESULT
|--------------------------------------------------------------------------
*/

socket.on(
    "answerResult",
    ({
        correct,
        points
    }) => {

        if (correct) {

            showAnswerMessage(
                `Correct! +${points} points 🎉`,
                "correct"
            );


            answerButtons.forEach(
                (button) => {

                    if (
                        button.classList.contains(
                            "selected-answer"
                        )
                    ) {

                        button.classList.remove(
                            "selected-answer"
                        );

                        button.classList.add(
                            "correct-answer"
                        );

                    }

                }
            );

        } else {

            showAnswerMessage(
                "Not quite!",
                "wrong"
            );


            answerButtons.forEach(
                (button) => {

                    if (
                        button.classList.contains(
                            "selected-answer"
                        )
                    ) {

                        button.classList.remove(
                            "selected-answer"
                        );

                        button.classList.add(
                            "wrong-answer"
                        );

                    }

                }
            );

        }

    }
);


/*
|--------------------------------------------------------------------------
| ANSWER MESSAGE
|--------------------------------------------------------------------------
*/

function showAnswerMessage(
    text,
    type
) {

    answerMessage.textContent =
        text;


    answerMessage.classList.remove(
        "hidden"
    );


    answerMessage.classList.remove(
        "message-correct"
    );

    answerMessage.classList.remove(
        "message-wrong"
    );

    answerMessage.classList.remove(
        "message-timeout"
    );


    if (
        type ===
        "correct"
    ) {

        answerMessage.classList.add(
            "message-correct"
        );

    } else if (
        type ===
        "wrong"
    ) {

        answerMessage.classList.add(
            "message-wrong"
        );

    } else {

        answerMessage.classList.add(
            "message-timeout"
        );

    }


    answerMessage.classList.remove(
        "message-pop"
    );

    void answerMessage.offsetWidth;

    answerMessage.classList.add(
        "message-pop"
    );

}


/*
|--------------------------------------------------------------------------
| SCORE UPDATE
|--------------------------------------------------------------------------
*/

socket.on(
    "scoreUpdate",
    (players) => {

        renderScoreboard(
            players
        );

    }
);


/*
|--------------------------------------------------------------------------
| LIVE SCOREBOARD
|--------------------------------------------------------------------------
*/

function renderScoreboard(
    players
) {

    if (!scoreboard) {
        return;
    }


    scoreboard.innerHTML =
        "";


    const sortedPlayers =
        [...players].sort(
            (a, b) =>
                b.score -
                a.score
        );


    sortedPlayers.forEach(
        (player, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "player score-row";


            const position =
                document.createElement(
                    "span"
                );

            position.className =
                "score-position";


            if (index === 0) {

                position.textContent =
                    "🥇";

            } else if (
                index === 1
            ) {

                position.textContent =
                    "🥈";

            } else if (
                index === 2
            ) {

                position.textContent =
                    "🥉";

            } else {

                position.textContent =
                    `${index + 1}`;

            }


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "score-name";

            name.textContent =
                player.name;


            const score =
                document.createElement(
                    "span"
                );

            score.className =
                "score-value";

            score.textContent =
                player.score;


            row.appendChild(
                position
            );

            row.appendChild(
                name
            );

            row.appendChild(
                score
            );


            scoreboard.appendChild(
                row
            );

        }
    );

}


/*
|--------------------------------------------------------------------------
| GAME FINISHED
|--------------------------------------------------------------------------
*/

socket.on(
    "gameFinished",
    (players) => {

        clearInterval(
            timerInterval
        );


        /*
        |--------------------------------------------------------------------------
        | STOP TIMER
        |--------------------------------------------------------------------------
        */

        timerElement.textContent =
            "";

        timerElement.classList.remove(
            "timer-warning"
        );


        if (timerProgress) {

            timerProgress.style.transition =
                "none";

            timerProgress.style.width =
                "0%";

        }


        /*
        |--------------------------------------------------------------------------
        | CHANGE QUESTION HEADER
        |--------------------------------------------------------------------------
        */

        questionNumberElement.textContent =
            "Final Results";


        questionElement.classList.remove(
            "question-changing"
        );

        void questionElement.offsetWidth;

        questionElement.classList.add(
            "game-over-animation"
        );


        questionElement.textContent =
            "🏆 Game Over!";


        /*
        |--------------------------------------------------------------------------
        | HIDE ANSWERS
        |--------------------------------------------------------------------------
        */

        answerButtons.forEach(
            (button) => {

                button.style.display =
                    "none";

            }
        );


        answerMessage.classList.add(
            "hidden"
        );


        /*
        |--------------------------------------------------------------------------
        | SHOW RESULTS NAVIGATION
        |--------------------------------------------------------------------------
        */

        resultsNavigation.classList.remove(
            "hidden"
        );


        /*
        |--------------------------------------------------------------------------
        | FINAL SCORES
        |--------------------------------------------------------------------------
        */

        renderFinalScores(
            players
        );

    }
);


/*
|--------------------------------------------------------------------------
| FINAL SCOREBOARD
|--------------------------------------------------------------------------
*/

function renderFinalScores(
    players
) {

    scoreboard.innerHTML =
        "";


    const sortedPlayers =
        [...players].sort(
            (a, b) =>
                b.score -
                a.score
        );


    sortedPlayers.forEach(
        (player, index) => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "player score-row final-score-row";


            if (index === 0) {

                row.classList.add(
                    "winner"
                );

            }


            const position =
                document.createElement(
                    "span"
                );

            position.className =
                "score-position";


            if (index === 0) {

                position.textContent =
                    "🏆";

            } else if (
                index === 1
            ) {

                position.textContent =
                    "🥈";

            } else if (
                index === 2
            ) {

                position.textContent =
                    "🥉";

            } else {

                position.textContent =
                    `${index + 1}`;

            }


            const name =
                document.createElement(
                    "span"
                );

            name.className =
                "score-name";

            name.textContent =
                player.name;


            const score =
                document.createElement(
                    "span"
                );

            score.className =
                "score-value";

            score.textContent =
                `${player.score} pts`;


            row.appendChild(
                position
            );

            row.appendChild(
                name
            );

            row.appendChild(
                score
            );


            scoreboard.appendChild(
                row
            );

        }
    );

}


/*
|--------------------------------------------------------------------------
| PLAY AGAIN
|--------------------------------------------------------------------------
|
| For now, "Play again" creates a fresh room.
| Later, when we upgrade server.js, we can make
| this a true rematch inside the same room.
|--------------------------------------------------------------------------
*/

playAgainButton.addEventListener(
    "click",
    () => {

        window.location.href =
            `/index.html?game=${encodeURIComponent(gameType)}&create=1`;

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

        alert(
            message
        );

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

        if (questionElement) {

            questionElement.textContent =
                "Reconnecting to game...";

        }

    }
);
