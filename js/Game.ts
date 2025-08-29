import { Ball } from './Ball.ts';
import { Paddle } from './Paddle.ts';
import { EventLogger } from './EventLogger.ts';
import { ReplaySystem } from './ReplaySystem.ts';
import { GameMode, KeyMap, FinalScores } from './types.ts';

export class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    ball: Ball;
    leftPaddle: Paddle;
    rightPaddle: Paddle;
    keys: KeyMap;
    lastTime: number;
    isRunning: boolean;
    isPaused: boolean;
    leftScore: number;
    rightScore: number;
    maxScore: number;
    eventLogger: EventLogger;
    replaySystem: ReplaySystem;
    mode: GameMode;
    lastHitPlayer: string | null;
    finalScores: FinalScores | null;
    animationId: number | null;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
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
        this.animationId = null;

        this.setupControls();
        this.gameLoop = this.gameLoop.bind(this);
    }

    setupControls(): void {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            e.preventDefault();
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
            e.preventDefault();
        });

        document.getElementById('startBtn')!.addEventListener('click', () => this.start());
        document.getElementById('pauseBtn')!.addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn')!.addEventListener('click', () => this.reset());
        document.getElementById('replayBtn')!.addEventListener('click', () => this.startReplay());
    }

    start(): void {
        if (this.mode === 'replay') {
            this.mode = 'play';
            this.replaySystem.stopReplay();
            document.getElementById('modeIndicator')!.textContent = 'MODE: PLAY';
        }

        this.isRunning = true;
        this.isPaused = false;
        this.leftScore = 0;
        this.rightScore = 0;
        this.updateScore();
        this.eventLogger.reset();
        this.replaySystem.replayLogger.reset();
        this.finalScores = null;
        this.ball.reset('left');
        this.leftPaddle.reset();
        this.rightPaddle.reset();
        this.lastHitPlayer = null;

        const targetPaddle = this.ball.velocity.x > 0 ? this.rightPaddle : this.leftPaddle;
        this.eventLogger.logEvent(
            'serve',
            this.ball.position,
            this.ball.velocity,
            'left',
            { x: targetPaddle.x + targetPaddle.width/2, y: targetPaddle.y + targetPaddle.height/2 }
        );

        (document.getElementById('startBtn') as HTMLButtonElement).disabled = true;
        (document.getElementById('pauseBtn') as HTMLButtonElement).disabled = false;
        (document.getElementById('replayBtn') as HTMLButtonElement).disabled = true;
        (document.getElementById('exportBtn') as HTMLButtonElement).disabled = true;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.lastTime = performance.now();
        this.gameLoop();
    }

    serve(side: 'left' | 'right' | null = null, logEvent: boolean = true): void {
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

    togglePause(): void {
        this.isPaused = !this.isPaused;
        document.getElementById('pauseBtn')!.textContent = this.isPaused ? 'RESUME' : 'PAUSE';
    }

    reset(clearLogs: boolean = true): void {
        this.isRunning = false;
        this.isPaused = false;
        this.mode = 'play';
        this.leftScore = 0;
        this.rightScore = 0;
        this.ball.position.x = this.canvas.width / 2;
        this.ball.position.y = this.canvas.height / 2;
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.leftPaddle.y = this.canvas.height / 2 - this.leftPaddle.height / 2;
        this.rightPaddle.y = this.canvas.height / 2 - this.rightPaddle.height / 2;
        this.lastHitPlayer = null;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.updateScore();
        (document.getElementById('startBtn') as HTMLButtonElement).disabled = false;
        (document.getElementById('pauseBtn') as HTMLButtonElement).disabled = true;
        document.getElementById('pauseBtn')!.textContent = 'PAUSE';
        document.getElementById('modeIndicator')!.textContent = 'MODE: PLAY';

        this.replaySystem.stopReplay();

        if (clearLogs) {
            this.finalScores = null;
            this.eventLogger.reset();
            this.replaySystem.replayLogger.reset();
            (document.getElementById('replayBtn') as HTMLButtonElement).disabled = true;
            (document.getElementById('exportBtn') as HTMLButtonElement).disabled = true;
        } else {
            const hasEvents = this.eventLogger.events.length > 0;
            (document.getElementById('replayBtn') as HTMLButtonElement).disabled = !hasEvents;
            (document.getElementById('exportBtn') as HTMLButtonElement).disabled = !hasEvents;
        }

        this.render();
    }

    startReplay(): void {
        if (this.eventLogger.events.length === 0) return;

        this.mode = 'replay';
        this.isRunning = true;
        this.isPaused = false;
        this.leftScore = 0;
        this.rightScore = 0;
        this.leftPaddle.reset();
        this.rightPaddle.reset();
        this.updateScore();

        document.getElementById('modeIndicator')!.textContent = 'MODE: REPLAY';
        (document.getElementById('startBtn') as HTMLButtonElement).disabled = true;
        (document.getElementById('pauseBtn') as HTMLButtonElement).disabled = false;
        (document.getElementById('replayBtn') as HTMLButtonElement).disabled = true;

        this.replaySystem.startReplay(this.eventLogger.events);

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.lastTime = performance.now();
        this.gameLoop();
    }

    exportLog(): void {
        const logData = this.eventLogger.exportLog();
        const blob = new Blob([logData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pong-replay-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importLog(): void {
        document.getElementById('fileInput')!.click();
    }

    handleFileImport(event: { target: { files: File[] } }): void {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = e.target!.result as string;
                const success = this.eventLogger.importLog(importedData);

                if (success) {
                    const events = JSON.parse(importedData);
                    let leftScore = 0;
                    let rightScore = 0;

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

                    if (leftScore >= this.maxScore || rightScore >= this.maxScore) {
                        this.finalScores = {
                            left: leftScore,
                            right: rightScore,
                            winner: leftScore >= this.maxScore ? 'LEFT' : 'RIGHT'
                        };
                    }

                    this.reset(false);
                    (document.getElementById('replayBtn') as HTMLButtonElement).disabled = false;
                    (document.getElementById('exportBtn') as HTMLButtonElement).disabled = false;
                } else {
                    alert('Failed to import game log. Invalid format.');
                }
            } catch (error) {
                alert('Failed to import game log. Invalid file format.');
                console.error('Import error:', error);
            }
        };

        reader.readAsText(file);
        (event.target as any).value = '';
    }

    updateScore(): void {
        document.getElementById('leftScore')!.textContent = this.leftScore.toString();
        document.getElementById('rightScore')!.textContent = this.rightScore.toString();
    }

    gameLoop(currentTime: number = 0): void {
        if (this.lastTime === 0 || currentTime === 0) {
            this.lastTime = currentTime || performance.now();
            this.render();
            this.animationId = requestAnimationFrame(this.gameLoop);
            return;
        }

        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.016);
        this.lastTime = currentTime;

        if (this.isRunning && !this.isPaused) {
            if (this.mode === 'play') {
                this.leftPaddle.update(deltaTime, this.keys);
                this.rightPaddle.update(deltaTime, this.keys);

                if (this.leftPaddle.checkCollision(this.ball)) {
                    this.lastHitPlayer = 'left';
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
                    const targetPaddle = this.ball.velocity.x > 0 ? this.rightPaddle : this.leftPaddle;
                    this.eventLogger.logEvent(
                        'hit',
                        this.ball.position,
                        this.ball.velocity,
                        'right',
                        { x: targetPaddle.x + targetPaddle.width/2, y: targetPaddle.y + targetPaddle.height/2 }
                    );
                }

                this.ball.update(deltaTime);

                if (this.ball.isOutOfBounds()) {
                    console.log('Ball out of bounds!', {
                        x: this.ball.position.x,
                        y: this.ball.position.y,
                        timestamp: Date.now() - this.eventLogger.startTime!
                    });

                    const scoringPlayer = this.ball.getScoringPlayer();

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

    render(): void {
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

    endGame(): void {
        this.isRunning = false;
        const winner = this.leftScore >= this.maxScore ? 'LEFT' : 'RIGHT';
        this.finalScores = { left: this.leftScore, right: this.rightScore, winner };

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        setTimeout(() => {
            alert(`ORIGINAL GAME\n${winner} PLAYER WINS!\nScore: ${this.leftScore} - ${this.rightScore}`);
            (document.getElementById('startBtn') as HTMLButtonElement).disabled = false;
            (document.getElementById('pauseBtn') as HTMLButtonElement).disabled = true;
            (document.getElementById('replayBtn') as HTMLButtonElement).disabled = false;
            (document.getElementById('exportBtn') as HTMLButtonElement).disabled = false;
        }, 100);
    }

    endReplay(): void {
        this.mode = 'play';
        this.isRunning = false;

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        const comparison = this.eventLogger.compareWith(this.replaySystem.replayLogger);
        const replayWinner = this.leftScore >= this.maxScore ? 'LEFT' : 'RIGHT';

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
            this.reset(false);
        }, 100);
    }
}
