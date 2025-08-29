import { Ball } from './Ball.ts';
import { Paddle } from './Paddle.ts';
import { Events } from './Events.ts';
import { Replay } from './Replay.ts';
import { Engine, CollisionResult } from './Engine.ts';
import { GameMode, KeyMap, FinalScores, PaddleSide } from '../types.ts';
import { GAME_CONSTANTS } from '../constants.ts';
import { GameUtils } from '../utils/GameUtils.ts';
import { DOMUtils } from '../utils/DOMUtils.ts';

export class Game {
    canvas: HTMLCanvasElement;
    engine: Engine;
    ball: Ball;
    leftPaddle: Paddle;
    rightPaddle: Paddle;
    keys: KeyMap;
    lastTime: number;
    isRunning: boolean;
    leftScore: number;
    rightScore: number;
    eventLogger: Events;
    replaySystem: Replay;
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

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.engine = new Engine(canvas);
        this.ball = new Ball(canvas);
        this.leftPaddle = new Paddle(canvas, this.paddleOffset, 'left');
        this.rightPaddle = new Paddle(canvas, canvas.width - this.paddleOffset - this.paddleWidth, 'right');
        this.keys = {};
        this.lastTime = 0;
        this.isRunning = false;
        this.leftScore = 0;
        this.rightScore = 0;
        this.eventLogger = new Events('originalLogContent');
        this.replaySystem = new Replay(canvas, this.engine, this.eventLogger);
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
    }

    start(): void {
        if (this.mode === 'replay') {
            this.mode = 'play';
            this.replaySystem.stopReplay();
            DOMUtils.setElementText('modeIndicator', 'MODE: PLAY');
        }

        this.isRunning = true;
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
        this.engine.resetStates();
        this.engine.syncBothStatesForReset(this.ball, this.leftPaddle, this.rightPaddle);

        this.eventLogger.logServeEvent(
            this.ball.velocity,
            'left',
            this.leftPaddle.y + this.leftPaddle.height/2,
            this.rightPaddle.y + this.rightPaddle.height/2,
            this.engine.currentTick
        );

        DOMUtils.setButtonsDisabled(['startBtn', 'replayBtn', 'exportBtn'], true);

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
        this.engine.syncBothStatesForReset(this.ball, this.leftPaddle, this.rightPaddle);

        if (logEvent && this.mode === 'play') {
            this.eventLogger.logServeEvent(
                this.ball.velocity,
                servingSide,
                this.leftPaddle.y + this.leftPaddle.height/2,
                this.rightPaddle.y + this.rightPaddle.height/2,
                this.engine.currentTick
            );
        }
    }

    reset(clearLogs: boolean = true): void {
        this.isRunning = false;
        this.mode = 'play';
        this.leftScore = 0;
        this.rightScore = 0;
        this.ball.position = GameUtils.getCanvasCenter(this.canvas);
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.leftPaddle.y = GameUtils.getPaddleCenterY(this.canvas);
        this.rightPaddle.y = GameUtils.getPaddleCenterY(this.canvas);
        this.lastHitPlayer = null;
        
        // Reset tick-based simulation
        this.engine.resetStates();
        this.engine.syncBothStatesForReset(this.ball, this.leftPaddle, this.rightPaddle);

        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        this.updateScore();
        DOMUtils.setButtonDisabled('startBtn', false);
        DOMUtils.setElementText('modeIndicator', 'MODE: PLAY');

        this.replaySystem.stopReplay();

        if (clearLogs) {
            this.finalScores = null;
            this.eventLogger.reset();
            this.replaySystem.replayLogger.reset();
            DOMUtils.setButtonsDisabled(['replayBtn', 'exportBtn'], true);
            // Clear file input to allow re-import of same file
            DOMUtils.getInputElement('fileInput').value = '';
        } else {
            const hasEvents = this.eventLogger.events.length > 0;
            DOMUtils.setButtonDisabled('replayBtn', !hasEvents);
            DOMUtils.setButtonDisabled('exportBtn', !hasEvents);
        }

        this.render();
    }

    startReplay(): void {
        if (this.eventLogger.events.length === 0) return;

        this.mode = 'replay';
        this.isRunning = true;
        this.leftScore = 0;
        this.rightScore = 0;
        this.leftPaddle.reset();
        this.rightPaddle.reset();
        this.updateScore();
        
        // Initialize ball to center and sync states
        this.ball.position = GameUtils.getCanvasCenter(this.canvas);
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
        this.engine.resetStates();
        this.engine.syncBothStatesForReset(this.ball, this.leftPaddle, this.rightPaddle);

        DOMUtils.setElementText('modeIndicator', 'MODE: REPLAY');
        DOMUtils.setButtonsDisabled(['startBtn', 'replayBtn'], true);

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
        DOMUtils.getElement('fileInput').click();
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

                    const logDiv = DOMUtils.getElement('originalLogContent');
                    logDiv.innerHTML = '';
                    for (const event of events) {
                        this.eventLogger.displayEvent(event, true, true); // Skip scroll and animation during import
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
                    DOMUtils.setButtonsDisabled(['replayBtn', 'exportBtn'], false);
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
        DOMUtils.setElementText('leftScore', this.leftScore.toString());
        DOMUtils.setElementText('rightScore', this.rightScore.toString());
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
        
        if (this.isRunning) {
            this.engine.processPhysicsTicks(
                frameTime,
                this.ball,
                this.leftPaddle,
                this.rightPaddle,
                this.keys,
                this.mode,
                (result: CollisionResult) => {
                    // Handle physics events from the engine
                    if (result.leftHit) {
                        this.lastHitPlayer = 'left';
                        this.eventLogger.logHitEvent(
                            this.ball.position,
                            this.ball.velocity,
                            'left',
                            this.leftPaddle.y + this.leftPaddle.height/2,
                            this.rightPaddle.y + this.rightPaddle.height/2,
                            this.engine.currentTick
                        );
                    }
                    
                    if (result.rightHit) {
                        this.lastHitPlayer = 'right';
                        this.eventLogger.logHitEvent(
                            this.ball.position,
                            this.ball.velocity,
                            'right',
                            this.leftPaddle.y + this.leftPaddle.height/2,
                            this.rightPaddle.y + this.rightPaddle.height/2,
                            this.engine.currentTick
                        );
                    }
                    
                    if (result.ballOutOfBounds && result.scoringPlayer && this.mode === 'play') {
                        this.eventLogger.logScoreEvent(
                            this.ball.position,
                            this.ball.velocity,
                            result.scoringPlayer,
                            this.engine.currentTick
                        );

                        if (result.scoringPlayer === 'left') {
                            this.leftScore++;
                        } else {
                            this.rightScore++;
                        }

                        this.updateScore();

                        if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
                            this.endGame();
                        } else {
                            const nextServer = result.scoringPlayer === 'left' ? 'right' : 'left';
                            this.ball.reset(nextServer);
                            this.lastHitPlayer = null;
                            
                            // Sync states after reset to prevent interpolation
                            this.engine.syncBothStatesForReset(this.ball, this.leftPaddle, this.rightPaddle);

                            this.eventLogger.logServeEvent(
                                this.ball.velocity,
                                nextServer,
                                this.leftPaddle.y + this.leftPaddle.height/2,
                                this.rightPaddle.y + this.rightPaddle.height/2,
                                this.engine.currentTick
                            );
                        }
                    }

                }
            );
            
            // Handle replay mode separately
            if (this.mode === 'replay') {
                const ballStateChanged = this.replaySystem.updateTick(this.engine.currentTick, this.ball, this.leftPaddle, this.rightPaddle);
                
                if (ballStateChanged) {
                    this.engine.syncCurrentState(this.ball, this.leftPaddle, this.rightPaddle);
                }

                const scoreEvent = this.replaySystem.getLastProcessedScoreEvent();
                if (scoreEvent) {
                    if (scoreEvent.player === 'left') {
                        this.leftScore++;
                    } else {
                        this.rightScore++;
                    }
                    this.updateScore();
                    
                    this.engine.syncBothStatesForReset(this.ball, this.leftPaddle, this.rightPaddle);
                    
                    if (this.leftScore >= this.maxScore || this.rightScore >= this.maxScore) {
                        this.replaySystem.stopReplay();
                    }
                }

                if (!this.replaySystem.isActive) {
                    this.endReplay();
                }
            }
        }
        
        // Render with interpolation between physics states
        this.engine.renderInterpolated(this.ball, this.leftPaddle, this.rightPaddle, this.isRunning);
        this.animationId = requestAnimationFrame(this.gameLoop);
    }
    
    render(): void {
        this.engine.render(this.ball, this.leftPaddle, this.rightPaddle);
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
            DOMUtils.setButtonsDisabled(['replayBtn', 'exportBtn'], false);
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

        // Wait for CSS animation to complete before clearing highlights and showing alert
        setTimeout(() => {
            // Clear highlights after animation completes
            this.eventLogger.clearReplayHighlight();
            alert(message);
            this.reset(false);
        }, 500); // Wait for 0.5s CSS transition to complete
    }
}
