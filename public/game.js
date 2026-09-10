const socket = io({
    transports: [
        "websocket",
        "polling"
    ]
});


/* =========================
   ROOM INFORMATION
========================= */

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


/* =========================
   GAME STATE
========================= */

let currentQuestion =
    null;

let timerInterval =
    null;

let hasAnswered =
    false;

let currentTimeLimit =
    15;

let currentTimeLeft =
    15;


/* =========================
   ELEMENTS
========================= */

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


const answerButtons =
    document.querySelectorAll(
        ".answer"
    );


/* =========================
   CONNECT
========================= */

socket.on(
    "connect",
    () => {

        console.log(
            "Connected to Game Space:",
            socket.id
        );


        /*
         Tell the server we are here.

         IMPORTANT:
         This does NOT control when the
         game starts anymore.

         If the question already exists,
         the server sends it immediately.
        */

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


/* =========================
   ANSWER BUTTONS
========================= */

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


/* =========================
   SUBMIT ANSWER
========================= */

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


/* =========================
   NEW QUESTION
========================= */

socket.on(
    "newQuestion",
    (question) => {

        console.log(
            "New question received:",
            question
        );


        currentQuestion =
            question;


        hasAnswered =
            false;


        currentTimeLimit =
            question.timeLimit;


        currentTimeLeft =
            question.timeLimit;


        /*
         Reset answer buttons.
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


                button.style.animationDelay =
                    "0s";

            }
        );


        answerMessage.classList.add(
            "hidden"
        );


        /*
         Question number.
        */

        questionNumberElement.textContent =
            `Question ${question.number} of ${question.total}`;


        /*
         Animate question.
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
         Populate answers.
        */

        answerButtons.forEach(
            (button, index) => {

                button.textContent =
                    question.answers[index];


                button.classList.remove(
                    "answer-changing"
                );


                void button.offsetWidth;


                button.style.animationDelay =
                    `${index * 0.06}s`;


                button.classList.add(
                    "answer-changing"
                );

            }
        );


        /*
         Start local countdown.
        */

        startTimer(
            question.timeLimit
        );

    }
);


/* =========================
   TIMER
========================= */

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


    /*
     Reset progress bar.
    */

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
                    timeLeft <= 5
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


/* =========================
   ANSWER RESULT
========================= */

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


/* =========================
   ANSWER MESSAGE
========================= */

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


/* =========================
   LIVE SCORES
========================= */

socket.on(
    "scoreUpdate",
    (players) => {

        renderScoreboard(
            players
        );

    }
);


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


    if (
        sortedPlayers.length === 0
    ) {

        scoreboard.innerHTML =
            `
            <div class="player">
                Waiting for players...
            </div>
            `;

        return;

    }


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

            } else if (index === 1) {

                position.textContent =
                    "🥈";

            } else if (index === 2) {

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


/* =========================
   GAME FINISHED
========================= */

socket.on(
    "gameFinished",
    (players) => {

        clearInterval(
            timerInterval
        );


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


        answerButtons.forEach(
            (button) => {

                button.style.display =
                    "none";

            }
        );


        answerMessage.classList.add(
            "hidden"
        );


        renderFinalScores(
            players
        );

    }
);


/* =========================
   FINAL SCORES
========================= */

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

            } else if (index === 1) {

                position.textContent =
                    "🥈";

            } else if (index === 2) {

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


/* =========================
   ERROR HANDLING
========================= */

socket.on(
    "errorMessage",
    (message) => {

        alert(
            message
        );

    }
);


socket.on(
    "connect_error",
    (error) => {

        console.error(
            "Socket connection error:",
            error
        );


        questionElement.textContent =
            "Reconnecting to game...";

    }
);
