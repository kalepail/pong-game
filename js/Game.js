import { Ball } from './Ball.js';
import { Paddle } from './Paddle.js';
import { EventLogger } from './EventLogger.js';
import { ReplaySystem } from './ReplaySystem.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ball = new Ball(canvas);
        this.leftPaddle = new Paddle(canvas, 30, 'left');
        this.rightPaddle = new Paddle(canvas, canvas.width - 40, 'right');
        this.keys = {};
        this.lastTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.leftScore = 0;
        this.rightScore = 0;
        this.maxScore = 5;
        this.eventLogger = new EventLogger('originalLogContent');
        this.replaySystem = new ReplaySystem(canvas);
        this.mode = 'play';
        this.lastHitPlayer = null;
        this.finalScores = null;

        this.setupControls();
        this.gameLoop = this.gameLoop.bind(this);
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            e.preventDefault();
        });

        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('replayBtn').addEventListener('click', () => this.startReplay());


        // Note: importBtn and fileInput event listeners are handled in main.js
    }

    start() {
        if (this.mode === 'replay') {
            this.mode = 'play';
            this.replaySystem.stopReplay();
            document.getElementById('modeIndicator').textContent = 'MODE: PLAY';
        }

        this.isRunning = true;
        this.isPaused = false;
        this.leftScore = 0;
        this.rightScore = 0;
        this.updateScore();
        this.eventLogger.reset();
        this.replaySystem.replayLogger.reset();
        this.finalScores = null;
        // Initial serve from left
        this.ball.reset('left');
        this.lastHitPlayer = null;

        // Log the initial serve with actual ball position/velocity and target paddle position
        const targetPaddle = this.ball.velocity.x > 0 ? this.rightPaddle : this.leftPaddle;
        this.eventLogger.logEvent(
            'serve',
            this.ball.position,
            this.ball.velocity,
            'left',
            { x: targetPaddle.x + targetPaddle.width/2, y: targetPaddle.y + targetPaddle.height/2 }
        );

        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('replayBtn').disabled = true;
        document.getElementById('exportBtn').disabled = true;

        // Always cancel any existing animation and start fresh
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.lastTime = performance.now();
        this.gameLoop();
    }

    serve(side = null, logEvent = true) {
        const servingSide = side || (this.leftScore > this.rightScore ? 'right' : 'left');
        this.ball.reset(servingSide);
        this.lastHitPlayer = null;

        if (logEvent && this.mode === 'play') {
            const targetPaddle = this.ball.velocity.x > 0 ? this.rightPaddle : this.leftPaddle;
            this.eventLogger.logEvent(
                'serve',
                this.ball.position,
                this.ball.velocity,
                servingSide,
                { x: targetPaddle.x + targetPaddle.width/2, y: targetPaddle.y + targetPaddle.height/2 }
            );
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn').textContent = this.isPaused ? 'RESUME' : 'PAUSE';
    }

    reset(clearLogs = true) {
        this.isRunning = false;
        this.isPaused = false;
        this.mode = 'play';
        this.leftScore = 0;
        this.rightScore = 0;
        // Reset ball to center with no velocity
        this.ball.position.x = this.canvas.width / 2;
        this.ball.position.y = this.canvas.height / 2;
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.leftPaddle.y = this.canvas.height / 2 - this.leftPaddle.height / 2;
        this.rightPaddle.y = this.canvas.height / 2 - this.rightPaddle.height / 2;
        this.lastHitPlayer = null;

        // Cancel any existing animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.updateScore();
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'PAUSE';
        document.getElementById('modeIndicator').textContent = 'MODE: PLAY';

        // Stop any active replay
        this.replaySystem.stopReplay();

        if (clearLogs) {
            // Clear everything including logs
            this.finalScores = null;
            this.eventLogger.reset();
            this.replaySystem.replayLogger.reset();
            document.getElementById('replayBtn').disabled = true;
            document.getElementById('exportBtn').disabled = true;
        } else {
            // Keep logs for replay
            const hasEvents = this.eventLogger.events.length > 0;
            document.getElementById('replayBtn').disabled = !hasEvents;
            document.getElementById('exportBtn').disabled = !hasEvents;
        }

        // Render the reset state
        this.render();
    }

    startReplay() {
        if (this.eventLogger.events.length === 0) return;

        this.mode = 'replay';
        this.isRunning = true;
        this.isPaused = false;
        this.leftScore = 0;
        this.rightScore = 0;
        // Don't reset paddles or ball - let replay system handle positioning
        this.updateScore();

        document.getElementById('modeIndicator').textContent = 'MODE: REPLAY';
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('replayBtn').disabled = true;

        this.replaySystem.startReplay(this.eventLogger.events);

        // Always cancel any existing animation and start fresh
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.lastTime = performance.now();
        this.gameLoop();
    }

    exportLog() {
        const logData = this.eventLogger.exportLog();
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pong-replay-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importLog() {
        // Trigger the hidden file input
        document.getElementById('fileInput').click();
    }

    handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = e.target.result;
                const success = this.eventLogger.importLog(importedData);

                if (success) {
                    // Calculate final scores from the imported events
                    const events = JSON.parse(importedData);
                    let leftScore = 0;
                    let rightScore = 0;

                    // Display all imported events in the original game log
                    const logDiv = document.getElementById('originalLogContent');
                    if (logDiv) {
                        logDiv.innerHTML = '';
                        for (const event of events) {
                            this.eventLogger.displayEvent(event);
                        }
                    }

                    for (const event of events) {
                        if (event.type === 'score') {
                            if (event.player === 'left') {
                                leftScore++;
                            } else {
                                rightScore++;
                            }
                        }
                    }

                    // Store final scores for comparison
                    if (leftScore >= this.maxScore || rightScore >= this.maxScore) {
                        this.finalScores = {
                            left: leftScore,
                            right: rightScore,
                            winner: leftScore >= this.maxScore ? 'LEFT' : 'RIGHT'
                        };
                    }

                    // Reset the game state but keep the imported logs
                    this.reset(false);

                    // Enable replay button
                    document.getElementById('replayBtn').disabled = false;
                    document.getElementById('exportBtn').disabled = false;


                } else {
                    alert('Failed to import game log. Invalid format.');
                }
            } catch (error) {
                alert('Failed to import game log. Invalid file format.');
                console.error('Import error:', error);
            }
        };

        reader.readAsText(file);

        // Clear the file input so the same file can be re-imported
        event.target.value = '';
    }

    updateScore() {
        document.getElementById('leftScore').textContent = this.leftScore;
        document.getElementById('rightScore').textContent = this.rightScore;
    }

    gameLoop(currentTime = 0) {
        // Skip the first frame or handle invalid deltaTime
        if (this.lastTime === 0 || currentTime === 0) {
            this.lastTime = currentTime || performance.now();
            this.render();
            this.animationId = requestAnimationFrame(this.gameLoop);
            return;
        }

        // Clamp deltaTime to prevent huge jumps
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.016); // Cap at ~60fps
        this.lastTime = currentTime;

        if (this.isRunning && !this.isPaused) {
            if (this.mode === 'play') {
                this.leftPaddle.update(deltaTime, this.keys);
                this.rightPaddle.update(deltaTime, this.keys);

                // Check collisions BEFORE updating ball position
                if (this.leftPaddle.checkCollision(this.ball)) {
                    this.lastHitPlayer = 'left';
                    // Target paddle is the one the ball is now heading towards
                    const targetPaddle = this.ball.velocity.x > 0 ? this.rightPaddle : this.leftPaddle;
                    this.eventLogger.logEvent(
                        'hit',
                        this.ball.position,
                        this.ball.velocity,
                        'left',
                        { x: targetPaddle.x + targetPaddle.width/2, y: targetPaddle.y + targetPaddle.height/2 }
                    );
                }

                if (this.rightPaddle.checkCollision(this.ball)) {
                    this.lastHitPlayer = 'right';
                    // Target paddle is the one the ball is now heading towards
                    const targetPaddle = this.ball.velocity.x > 0 ? this.rightPaddle : this.leftPaddle;
                    this.eventLogger.logEvent(
                        'hit',
                        this.ball.position,
                        this.ball.velocity,
                        'right',
                        { x: targetPaddle.x + targetPaddle.width/2, y: targetPaddle.y + targetPaddle.height/2 }
                    );
                }

                // Now update ball position
                this.ball.update(deltaTime);

                if (this.ball.isOutOfBounds()) {
                    console.log('Ball out of bounds!', {
                        x: this.ball.position.x,
                        y: this.ball.position.y,
                        timestamp: Date.now() - this.eventLogger.startTime
                    });

                    const scoringPlayer = this.ball.getScoringPlayer();

                    // Log the score event BEFORE updating score
                    this.eventLogger.logEvent(
                        'score',
                        this.ball.position,
                        this.ball.velocity,
                        scoringPlayer
                    );

                    if (scoringPlayer === 'left') {
                        this.leftScore++;
                    } else {
                        this.rightScore++;
                    }

                    this.updateScore();

                    if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
                        this.endGame();
                    } else {
                        const nextServer = scoringPlayer === 'left' ? 'right' : 'left';
                        this.ball.reset(nextServer);
                        this.lastHitPlayer = null;

                        this.eventLogger.logEvent(
                            'serve',
                            this.ball.position,
                            this.ball.velocity,
                            nextServer
                        );
                    }
                }
            } else if (this.mode === 'replay') {
                this.replaySystem.update(deltaTime, this.ball, this.leftPaddle, this.rightPaddle);

                // Always count all score events up to current point for accurate scoring
                const allScores = this.replaySystem.events
                    .slice(0, this.replaySystem.currentEventIndex)
                    .filter(e => e.type === 'score');

                let leftPoints = 0;
                let rightPoints = 0;

                for (const scoreEvent of allScores) {
                    if (scoreEvent.player === 'left') {
                        leftPoints++;
                    } else {
                        rightPoints++;
                    }
                }

                if (leftPoints !== this.leftScore || rightPoints !== this.rightScore) {
                    this.leftScore = leftPoints;
                    this.rightScore = rightPoints;
                    this.updateScore();
                }

                // Check if game is over based on score
                if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
                    this.replaySystem.stopReplay();
                }

                if (!this.replaySystem.isActive) {
                    this.endReplay();
                }
            }
        }

        this.render();
        this.animationId = requestAnimationFrame(this.gameLoop);
    }

    render() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#0f0';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.leftPaddle.draw(this.ctx);
        this.rightPaddle.draw(this.ctx);
        this.ball.draw(this.ctx);
    }

    endGame() {
        this.isRunning = false;
        const winner = this.leftScore >= this.maxScore ? 'LEFT' : 'RIGHT';
        this.finalScores = { left: this.leftScore, right: this.rightScore, winner };

        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        setTimeout(() => {
            alert(`ORIGINAL GAME\n${winner} PLAYER WINS!\nScore: ${this.leftScore} - ${this.rightScore}`);
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
            document.getElementById('replayBtn').disabled = false;
            document.getElementById('exportBtn').disabled = false;
        }, 100);
    }

    endReplay() {
        this.mode = 'play';
        this.isRunning = false;

        // Cancel animation frame
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        const comparison = this.eventLogger.compareWith(this.replaySystem.replayLogger);
        const replayWinner = this.leftScore >= this.maxScore ? 'LEFT' : 'RIGHT';

        // Store replay scores before reset
        const replayLeftScore = this.leftScore;
        const replayRightScore = this.rightScore;

        let message = `REPLAY COMPLETE\n\n`;
        message += `Original: ${this.finalScores ? this.finalScores.winner : 'Unknown'} wins `;
        message += `(${this.finalScores ? this.finalScores.left : '?'} - ${this.finalScores ? this.finalScores.right : '?'})\n`;
        message += `Replay: ${replayWinner} wins (${replayLeftScore} - ${replayRightScore})\n\n`;
        message += `Events Comparison:\n`;
        message += `Original: ${comparison.original} events\n`;
        message += `Replay: ${comparison.replay} events\n`;
        message += `Matching: ${comparison.matching} events\n`;
        message += comparison.identical ? 'PERFECT REPLAY!' : 'Some differences detected';

        setTimeout(() => {
            alert(message);
            this.reset(false); // Keep logs after replay
        }, 100);
    }
}