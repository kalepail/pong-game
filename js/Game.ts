import { Ball } from './Ball.ts';
import { Paddle } from './Paddle.ts';
import { EventLogger } from './EventLogger.ts';
import { ReplaySystem } from './ReplaySystem.ts';
import { GameMode, KeyMap, FinalScores, PaddleSide } from './types.ts';
import { GAME_CONSTANTS } from './constants.ts';

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
    eventLogger: EventLogger;
    replaySystem: ReplaySystem;
    mode: GameMode;
    lastHitPlayer: string | null;
    finalScores: FinalScores | null;
    animationId: number | null;
    
    // Game constants loaded into class properties
    readonly maxScore: number = GAME_CONSTANTS.MAX_SCORE;
    readonly paddleOffset: number = GAME_CONSTANTS.PADDLE_OFFSET;
    readonly paddleWidth: number = GAME_CONSTANTS.PADDLE_WIDTH;
    readonly paddleHeight: number = GAME_CONSTANTS.PADDLE_HEIGHT;
    readonly canvasWidth: number = GAME_CONSTANTS.CANVAS_WIDTH;
    readonly canvasHeight: number = GAME_CONSTANTS.CANVAS_HEIGHT;
    
    // Tick-based physics simulation - mathematically deterministic
    readonly TICKS_PER_SECOND: number = GAME_CONSTANTS.TICKS_PER_SECOND;
    readonly TICK_DURATION: number = 1 / GAME_CONSTANTS.TICKS_PER_SECOND;
    currentTick: number = 0;
    tickTimer: number = 0;
    
    // Physics states for interpolation
    currentState: {
        ball: { x: number; y: number };
        leftPaddle: { y: number };
        rightPaddle: { y: number };
    };
    previousState: {
        ball: { x: number; y: number };
        leftPaddle: { y: number };
        rightPaddle: { y: number };
    };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.ball = new Ball(canvas);
        this.leftPaddle = new Paddle(canvas, this.paddleOffset, 'left');
        this.rightPaddle = new Paddle(canvas, canvas.width - this.paddleOffset - this.paddleWidth, 'right');
        this.keys = {};
        this.lastTime = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.leftScore = 0;
        this.rightScore = 0;
        this.eventLogger = new EventLogger('originalLogContent');
        this.replaySystem = new ReplaySystem(canvas);
        this.mode = 'play';
        this.lastHitPlayer = null;
        this.finalScores = null;
        this.animationId = null;
        this.currentTick = 0;
        this.tickTimer = 0;
        
        // Initialize current and previous states
        this.currentState = {
            ball: { x: this.canvasWidth / 2, y: this.canvasHeight / 2 },
            leftPaddle: { y: this.canvasHeight / 2 - this.paddleHeight / 2 },
            rightPaddle: { y: this.canvasHeight / 2 - this.paddleHeight / 2 }
        };
        this.previousState = {
            ball: { x: this.canvasWidth / 2, y: this.canvasHeight / 2 },
            leftPaddle: { y: this.canvasHeight / 2 - this.paddleHeight / 2 },
            rightPaddle: { y: this.canvasHeight / 2 - this.paddleHeight / 2 }
        };

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
    }
    
    syncCurrentState(): void {
        this.currentState.ball.x = this.ball.position.x;
        this.currentState.ball.y = this.ball.position.y;
        this.currentState.leftPaddle.y = this.leftPaddle.y;
        this.currentState.rightPaddle.y = this.rightPaddle.y;
    }
    
    syncPreviousState(): void {
        this.previousState.ball.x = this.currentState.ball.x;
        this.previousState.ball.y = this.currentState.ball.y;
        this.previousState.leftPaddle.y = this.currentState.leftPaddle.y;
        this.previousState.rightPaddle.y = this.currentState.rightPaddle.y;
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
        
        // Initialize states for tick-based simulation
        this.currentTick = 0;
        this.tickTimer = 0;
        this.syncCurrentState();
        this.syncPreviousState();

        this.eventLogger.logServeEvent(
            this.ball.velocity,
            'left',
            this.leftPaddle.y + this.leftPaddle.height/2,
            this.rightPaddle.y + this.rightPaddle.height/2,
            this.currentTick
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

    serve(side?: PaddleSide, logEvent: boolean = true): void {
        const servingSide = side ?? (this.leftScore > this.rightScore ? 'right' : 'left');
        this.ball.reset(servingSide);
        this.lastHitPlayer = null;
        
        // Sync states after reset
        this.syncCurrentState();
        this.syncPreviousState();

        if (logEvent && this.mode === 'play') {
            this.eventLogger.logServeEvent(
                this.ball.velocity,
                servingSide,
                this.leftPaddle.y + this.leftPaddle.height/2,
                this.rightPaddle.y + this.rightPaddle.height/2,
                this.currentTick
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
        
        // Reset tick-based simulation
        this.currentTick = 0;
        this.tickTimer = 0;
        this.syncCurrentState();
        this.syncPreviousState();

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
        
        // Initialize ball to center and sync states
        this.ball.position.x = this.canvas.width / 2;
        this.ball.position.y = this.canvas.height / 2;
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.currentTick = 0;
        this.tickTimer = 0;
        this.syncCurrentState();
        this.syncPreviousState();

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
                            winner: leftScore >= this.maxScore ? 'left' : 'right'
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

        const frameTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms (10fps min)
        this.lastTime = currentTime;
        
        if (this.isRunning && !this.isPaused) {
            // Accumulate time for tick-based physics
            this.tickTimer += frameTime;
            
            // Run discrete physics ticks at exactly 60Hz - mathematically deterministic
            while (this.tickTimer >= this.TICK_DURATION) {
                // Save previous state before physics update
                this.syncPreviousState();
                
                // Update physics for one discrete tick with exact timing
                this.updatePhysicsTick();
                
                // Update current state from game objects
                this.syncCurrentState();
                
                // Increment tick counter (always integer, never floating point)
                this.currentTick++;
                
                // Subtract exact tick duration to maintain precision
                this.tickTimer -= this.TICK_DURATION;
            }
        }
        
        // Calculate interpolation factor for smooth visual rendering
        const alpha = this.isRunning && !this.isPaused ? (this.tickTimer / this.TICK_DURATION) : 0;
        
        // Render with interpolation between physics states
        this.renderInterpolated(alpha);
        this.animationId = requestAnimationFrame(this.gameLoop);
    }
    
    updatePhysicsTick(): void {
        if (this.mode === 'play') {
            // Update paddles with exact tick duration for deterministic movement
            this.leftPaddle.update(this.TICK_DURATION, this.keys);
            this.rightPaddle.update(this.TICK_DURATION, this.keys);

            // Check collisions before ball movement for precise detection
            if (this.leftPaddle.checkCollision(this.ball)) {
                this.lastHitPlayer = 'left';
                this.eventLogger.logHitEvent(
                    this.ball.position,
                    this.ball.velocity,
                    'left',
                    this.leftPaddle.y + this.leftPaddle.height/2,
                    this.rightPaddle.y + this.rightPaddle.height/2,
                    this.currentTick
                );
            }

            if (this.rightPaddle.checkCollision(this.ball)) {
                this.lastHitPlayer = 'right';
                this.eventLogger.logHitEvent(
                    this.ball.position,
                    this.ball.velocity,
                    'right',
                    this.leftPaddle.y + this.leftPaddle.height/2,
                    this.rightPaddle.y + this.rightPaddle.height/2,
                    this.currentTick
                );
            }

            // Update ball with exact tick duration for deterministic physics
            this.ball.update(this.TICK_DURATION);

            if (this.ball.isOutOfBounds()) {
                console.log('Ball out of bounds!', {
                    x: this.ball.position.x,
                    y: this.ball.position.y,
                    tick: this.currentTick
                });

                const scoringPlayer = this.ball.getScoringPlayer();

                this.eventLogger.logScoreEvent(
                    this.ball.position,
                    this.ball.velocity,
                    scoringPlayer,
                    this.currentTick
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
                    
                    // Sync states after reset for smooth transition
                    this.syncCurrentState();
                    this.syncPreviousState();

                    this.eventLogger.logServeEvent(
                        this.ball.velocity,
                        nextServer,
                        this.leftPaddle.y + this.leftPaddle.height/2,
                        this.rightPaddle.y + this.rightPaddle.height/2,
                        this.currentTick
                    );
                }
            }
        } else if (this.mode === 'replay') {
            // Update replay system and get whether ball state changed
            const ballStateChanged = this.replaySystem.updateTick(this.currentTick, this.ball, this.leftPaddle, this.rightPaddle);
            
            // If ball state changed from an event, sync interpolation states
            if (ballStateChanged) {
                this.syncCurrentState();
                this.syncPreviousState();
            } else {
                // Normal interpolated movement between events - advance ball physics
                this.ball.update(this.TICK_DURATION);
                // Update currentState after ball physics for smooth interpolation
                this.syncCurrentState();
            }

            // Check if replay system processed a score event this tick
            const scoreEvent = this.replaySystem.getLastProcessedScoreEvent();
            if (scoreEvent) {
                // Update score based on the event
                if (scoreEvent.player === 'left') {
                    this.leftScore++;
                } else {
                    this.rightScore++;
                }
                this.updateScore();
                
                // Sync states after score change for smooth transition
                this.syncCurrentState();
                this.syncPreviousState();
            }

            if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
                this.replaySystem.stopReplay();
            }

            if (!this.replaySystem.isActive) {
                this.endReplay();
            }
        }
    }

    render(): void {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#0f0';
        this.ctx.setLineDash([GAME_CONSTANTS.DASH_LENGTH, GAME_CONSTANTS.DASH_LENGTH]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.leftPaddle.draw(this.ctx);
        this.rightPaddle.draw(this.ctx);
        this.ball.draw(this.ctx);
    }
    
    renderInterpolated(alpha: number): void {
        // Clear canvas
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line
        this.ctx.strokeStyle = '#0f0';
        this.ctx.setLineDash([GAME_CONSTANTS.DASH_LENGTH, GAME_CONSTANTS.DASH_LENGTH]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Interpolate positions for smooth rendering (always forward progression)
        const ballX = this.previousState.ball.x + (this.currentState.ball.x - this.previousState.ball.x) * alpha;
        const ballY = this.previousState.ball.y + (this.currentState.ball.y - this.previousState.ball.y) * alpha;
        const leftPaddleY = this.previousState.leftPaddle.y + (this.currentState.leftPaddle.y - this.previousState.leftPaddle.y) * alpha;
        const rightPaddleY = this.previousState.rightPaddle.y + (this.currentState.rightPaddle.y - this.previousState.rightPaddle.y) * alpha;
        
        // Draw paddles at interpolated positions
        this.leftPaddle.drawAt(this.ctx, this.leftPaddle.x, leftPaddleY);
        this.rightPaddle.drawAt(this.ctx, this.rightPaddle.x, rightPaddleY);
        
        // Draw ball at interpolated position
        this.ball.drawAt(this.ctx, ballX, ballY);
    }

    endGame(): void {
        this.isRunning = false;
        const winner = this.leftScore >= this.maxScore ? 'left' : 'right';
        this.finalScores = { left: this.leftScore, right: this.rightScore, winner };

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        setTimeout(() => {
            alert(`ORIGINAL GAME\n${winner} PLAYER WINS!\nScore: ${this.leftScore} - ${this.rightScore}`);
            // Reset the game after showing the winner but keep the logs for replay
            this.reset(false);
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
        const replayWinner = this.leftScore >= this.maxScore ? 'left' : 'right';

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
