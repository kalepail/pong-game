import { EventLogger } from './EventLogger.ts';
import { GameEvent, Ball, Paddle, PaddleSide, EventType, HitEvent } from './types.ts';
import { Vec2 } from './Vec2.ts';
import { GAME_CONSTANTS, REPLAY_CONFIG, DERIVED_CONSTANTS } from './constants.ts';

interface PendingMove {
    targetY: number;
    eventIndex: number;
    type: 'hit' | 'miss' | 'position_for_next_hit' | 'position_for_serve_followup';
    executed: boolean;
}

interface PaddleTargets {
    left: number | null;
    right: number | null;
}

interface PendingMoves {
    left: PendingMove | null;
    right: PendingMove | null;
}

export class ReplaySystem {
    canvas: HTMLCanvasElement;
    events: GameEvent[];
    currentEventIndex: number;
    isActive: boolean;
    ballPosition: Vec2 | null;
    ballVelocity: Vec2 | null;
    replayLogger: EventLogger;
    originalLogger: EventLogger | null;
    paddleTargets: PaddleTargets;
    pendingMoves: PendingMoves;
    lastProcessedScoreEvent: GameEvent | null;

    constructor(canvas: HTMLCanvasElement, originalLogger?: EventLogger) {
        this.canvas = canvas;
        this.events = [];
        this.currentEventIndex = 0;
        this.isActive = false;
        this.ballPosition = null;
        this.ballVelocity = null;
        this.replayLogger = new EventLogger('replayLogContent');
        this.originalLogger = originalLogger || null;
        this.paddleTargets = { left: null, right: null };
        this.pendingMoves = { left: null, right: null };
        this.lastProcessedScoreEvent = null;
    }

    calculateBallY(targetX: number, ball: { position: Vec2; velocity: Vec2; radius: number }): number | null {
        const dx = targetX - ball.position.x;
        const vx = ball.velocity.x;
        
        if (Math.abs(vx) < REPLAY_CONFIG.VELOCITY_TOLERANCE || (dx * vx) < 0) return null;
        
        const time = dx / vx;
        let y = ball.position.y + ball.velocity.y * time;
        
        const height = this.canvas.height;
        const ballRadius = ball.radius;
        
        let bounces = 0;
        while (y < ballRadius || y > height - ballRadius) {
            if (y < ballRadius) {
                y = 2 * ballRadius - y;
                bounces++;
            } else if (y > height - ballRadius) {
                y = 2 * (height - ballRadius) - y;
                bounces++;
            }
        }
        
        return y;
    }

    paddleWouldIntercept(ball: { position: Vec2; velocity: Vec2; radius: number }, side: PaddleSide, currentPaddleY: number): boolean {
        // Remove paddle width from collision calculations - it's visual only
        const paddleFaceX = side === 'left' 
            ? DERIVED_CONSTANTS.PADDLE_FACE_X_LEFT 
            : DERIVED_CONSTANTS.PADDLE_FACE_X_RIGHT;
        const paddleTop = currentPaddleY;
        const paddleBottom = currentPaddleY + GAME_CONSTANTS.PADDLE_HEIGHT;
        
        const ballY = this.calculateBallY(paddleFaceX, ball);
        if (ballY === null) return false;
        
        const ballTop = ballY - ball.radius;
        const ballBottom = ballY + ball.radius;
        
        return ballBottom >= paddleTop && ballTop <= paddleBottom;
    }

    calculateMissPosition(ball: { position: Vec2; velocity: Vec2; radius: number }, missingSide: PaddleSide, currentPaddleY: number | null = null): { targetY: number } {
        const paddleFaceX = missingSide === 'left' 
            ? DERIVED_CONSTANTS.PADDLE_FACE_X_LEFT 
            : DERIVED_CONSTANTS.PADDLE_FACE_X_RIGHT;
        
        const ballHitY = this.calculateBallY(paddleFaceX, ball);
        if (ballHitY === null) return { targetY: this.canvas.height / 2 - GAME_CONSTANTS.PADDLE_HEIGHT / 2 };
        
        const ballTop = ballHitY - ball.radius;
        const ballBottom = ballHitY + ball.radius;
        
        const minCatchY = ballTop - GAME_CONSTANTS.PADDLE_HEIGHT;
        const maxCatchY = ballBottom;
        
        const safetyMargin = DERIVED_CONSTANTS.SAFETY_MARGIN;
        
        const avoidAbove = minCatchY - safetyMargin;
        const avoidBelow = maxCatchY + safetyMargin;
        
        if (currentPaddleY === null) {
            currentPaddleY = this.canvas.height / 2 - GAME_CONSTANTS.PADDLE_HEIGHT / 2;
        }
        
        let targetY: number;
        
        if (avoidAbove >= 0) {
            if (avoidBelow + GAME_CONSTANTS.PADDLE_HEIGHT <= this.canvas.height) {
                const distanceAbove = Math.abs(currentPaddleY - avoidAbove);
                const distanceBelow = Math.abs(currentPaddleY - avoidBelow);
                targetY = distanceAbove <= distanceBelow ? avoidAbove : avoidBelow;
            } else {
                targetY = avoidAbove;
            }
        } else if (avoidBelow + GAME_CONSTANTS.PADDLE_HEIGHT <= this.canvas.height) {
            targetY = avoidBelow;
        } else {
            const distanceFromTop = Math.abs(ballHitY - 0);
            const distanceFromBottom = Math.abs(ballHitY - this.canvas.height);
            targetY = distanceFromTop > distanceFromBottom ? 0 : this.canvas.height - GAME_CONSTANTS.PADDLE_HEIGHT;
        }
        
        targetY = Math.max(0, Math.min(this.canvas.height - GAME_CONSTANTS.PADDLE_HEIGHT, targetY));
        
        return { targetY };
    }

    calculateOptimalPaddlePosition(hitEvent: HitEvent, paddleHeight: number): { paddleTop: number; hitPosition: number; collisionPoint: { y: number } } {
        const collisionY = hitEvent.position.y;
        
        const targetVx = hitEvent.velocity.x;
        const targetVy = hitEvent.velocity.y;
        
        const requiredAngle = Math.atan2(targetVy, Math.abs(targetVx));
        
        const maxBounceAngle = GAME_CONSTANTS.MAX_BOUNCE_ANGLE;
        const normalizedPosition = Math.max(
            -GAME_CONSTANTS.NORMALIZED_POSITION_LIMIT, 
            Math.min(GAME_CONSTANTS.NORMALIZED_POSITION_LIMIT, requiredAngle / maxBounceAngle)
        );
        const hitPosition = (normalizedPosition + 1) / 2;
        
        const paddleTop = collisionY - (hitPosition * paddleHeight);
        
        return {
            paddleTop: paddleTop,
            hitPosition: hitPosition,
            collisionPoint: { y: collisionY }
        };
    }

    calculateEventMovements(event: GameEvent): void {
        
        switch (event.type) {
            case EventType.HIT: {
                const hitPlayer = event.player;
                const otherPlayer = hitPlayer === 'left' ? 'right' : 'left';
                
                // Clear the hitting paddle's current move (they just hit)
                this.pendingMoves[hitPlayer] = null;
                
                // Find the next hit by the other player to position for preemptively
                for (let i = this.currentEventIndex + 1; i < this.events.length; i++) {
                    const nextEvent = this.events[i];
                    if (nextEvent.type === EventType.HIT && nextEvent.player === otherPlayer) {
                        // Position hitting paddle for their next hit after opponent's hit
                        // Convert from recorded center position to top position
                        const preemptiveY = nextEvent.paddlePositions[hitPlayer] - GAME_CONSTANTS.PADDLE_HEIGHT / 2;
                        const clampedY = Math.max(0, Math.min(this.canvas.height - GAME_CONSTANTS.PADDLE_HEIGHT, preemptiveY));
                        
                        this.pendingMoves[hitPlayer] = {
                            targetY: clampedY,
                            eventIndex: i,
                            type: 'position_for_next_hit',
                            executed: false
                        };
                        break;
                    }
                }
                
                // Position the other paddle for the current hit (catch move) if they don't have a move
                if (!this.pendingMoves[otherPlayer]) {
                    // Look for the next hit by this other player
                    for (let i = this.currentEventIndex + 1; i < this.events.length; i++) {
                        const nextEvent = this.events[i];
                        if (nextEvent.type === EventType.HIT && nextEvent.player === otherPlayer) {
                            const optimalPosition = this.calculateOptimalPaddlePosition(nextEvent, GAME_CONSTANTS.PADDLE_HEIGHT);
                            
                            this.pendingMoves[otherPlayer] = {
                                targetY: optimalPosition.paddleTop,
                                eventIndex: i,
                                type: 'hit',
                                executed: false
                            };
                            break;
                        }
                    }
                }
                break;
            }
            
            case EventType.SERVE: {
                // Clear all pending moves on serve
                this.pendingMoves['left'] = null;
                this.pendingMoves['right'] = null;
                
                const servingPlayer = event.player;
                const receivingPlayer = servingPlayer === 'left' ? 'right' : 'left';
                
                // Position both players for upcoming hits
                for (let i = this.currentEventIndex + 1; i < this.events.length; i++) {
                    const nextEvent = this.events[i];
                    if (nextEvent.type === EventType.HIT && nextEvent.player === receivingPlayer) {
                        // Position receiving player for the hit
                        const optimalPosition = this.calculateOptimalPaddlePosition(nextEvent, GAME_CONSTANTS.PADDLE_HEIGHT);
                        this.pendingMoves[receivingPlayer] = {
                            targetY: optimalPosition.paddleTop,
                            eventIndex: i,
                            type: 'hit',
                            executed: false
                        };
                        
                        // Position serving player for their next hit after receiver hits
                        // Convert from recorded center position to top position
                        const preemptiveY = nextEvent.paddlePositions[servingPlayer] - GAME_CONSTANTS.PADDLE_HEIGHT / 2;
                        const clampedY = Math.max(0, Math.min(this.canvas.height - GAME_CONSTANTS.PADDLE_HEIGHT, preemptiveY));
                        this.pendingMoves[servingPlayer] = {
                            targetY: clampedY,
                            eventIndex: i,
                            type: 'position_for_serve_followup',
                            executed: false
                        };
                        break;
                    }
                }
                break;
            }
            
            case EventType.SCORE: {
                // Score avoidance is now handled proactively in setupScoreAvoidance()
                // Just clear the missing paddle's move since score has occurred
                const ballMovingLeft = this.ballVelocity!.x < 0;
                const missingSide = ballMovingLeft ? 'left' : 'right';
                
                // Clear any pending move for the missing side since score has happened
                this.pendingMoves[missingSide] = null;
                break;
            }
        }
    }

    setupScoreAvoidance(ball: Ball, leftPaddle: Paddle, rightPaddle: Paddle): void {
        // Look for upcoming score events and set up avoidance moves ONLY when paddle should miss
        for (let i = this.currentEventIndex; i < this.events.length; i++) {
            const event = this.events[i];
            
            if (event.type === EventType.SCORE) {
                const ballMovingLeft = ball.velocity.x < 0;
                const missingSide = ballMovingLeft ? 'left' : 'right';
                const currentPaddle = missingSide === 'left' ? leftPaddle : rightPaddle;
                
                // Check if there's a HIT event by this paddle before the SCORE
                let shouldHit = false;
                for (let j = this.currentEventIndex; j < i; j++) {
                    const checkEvent = this.events[j];
                    if (checkEvent.type === EventType.HIT && checkEvent.player === missingSide) {
                        shouldHit = true;
                        break;
                    }
                }
                
                // Only set up miss avoidance if paddle is NOT supposed to hit
                if (!shouldHit) {
                    // Check if paddle would interfere with score from current position
                    const wouldInterceptCurrent = this.paddleWouldIntercept(ball, missingSide, currentPaddle.y);
                    
                    // If paddle has a pending move, check if that target position would also interfere
                    let wouldInterceptTarget = false;
                    if (this.pendingMoves[missingSide]) {
                        wouldInterceptTarget = this.paddleWouldIntercept(ball, missingSide, this.pendingMoves[missingSide]!.targetY);
                    }
                    
                    // If paddle would interfere from current OR target position, force it to dodge
                    if (wouldInterceptCurrent || wouldInterceptTarget) {
                        const basePosition = this.pendingMoves[missingSide]?.targetY ?? currentPaddle.y;
                        const missPosition = this.calculateMissPosition(ball, missingSide, basePosition);
                        
                        this.pendingMoves[missingSide] = {
                            targetY: missPosition.targetY,
                            eventIndex: i,
                            type: 'miss',
                            executed: false
                        };
                    }
                }
                break; // Only handle first upcoming score
            }
        }
    }

    movePaddle(paddle: Paddle, deltaTime: number): void {
        const pendingMove = this.pendingMoves[paddle.side];
        if (!pendingMove) return;
        
        const targetY = pendingMove.targetY;
        const currentY = paddle.y;
        const paddleSpeed = GAME_CONSTANTS.PADDLE_SPEED;
        
        const distance = targetY - currentY;
        
        if (Math.abs(distance) < paddleSpeed * deltaTime) {
            paddle.y = Math.max(0, Math.min(this.canvas.height - paddle.height, targetY));
            pendingMove.executed = true;
            
            if (pendingMove.type === 'position_for_next_hit' || pendingMove.type === 'position_for_serve_followup') {
                this.pendingMoves[paddle.side] = null;
            }
        } else {
            const direction = Math.sign(distance);
            const newY = currentY + direction * paddleSpeed * deltaTime;
            paddle.y = Math.max(0, Math.min(this.canvas.height - paddle.height, newY));
        }
    }

    startReplay(events: GameEvent[]): void {
        this.events = [...events];
        this.currentEventIndex = 0;
        this.isActive = true;
        this.replayLogger.reset();
        this.pendingMoves = { left: null, right: null };
        this.lastProcessedScoreEvent = null;

        if (this.events.length > 0) {
            const firstEvent = this.events[0];
            switch (firstEvent.type) {
                case EventType.HIT:
                case EventType.SCORE:
                    this.ballPosition = { ...firstEvent.position };
                    break;
                case EventType.SERVE:
                    this.ballPosition = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
                    break;
            }
            this.ballVelocity = { ...firstEvent.velocity };
        }
    }

    updateTick(currentTick: number, ball: Ball, leftPaddle: Paddle, rightPaddle: Paddle): boolean {
        if (!this.isActive || this.events.length === 0) return false;

        // Clear the last processed score event at the start of each tick
        this.lastProcessedScoreEvent = null;

        // Check for upcoming score events and set up avoidance moves BEFORE moving paddles
        this.setupScoreAvoidance(ball, leftPaddle, rightPaddle);

        this.movePaddle(leftPaddle, DERIVED_CONSTANTS.TICK_DURATION); // Exact tick duration for deterministic paddle movement
        this.movePaddle(rightPaddle, DERIVED_CONSTANTS.TICK_DURATION);

        let ballStateChanged = false;
        const eventsInThisTick: number[] = [];

        // Process events that should occur at this tick
        while (this.currentEventIndex < this.events.length) {
            const event = this.events[this.currentEventIndex];
            
            if (event.tick > currentTick) break;

            eventsInThisTick.push(this.currentEventIndex);

            // Handle position based on event type
            switch (event.type) {
                case EventType.HIT:
                case EventType.SCORE:
                    this.ballPosition = { ...event.position };
                    break;
                case EventType.SERVE:
                    this.ballPosition = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
                    break;
            }
            this.ballVelocity = { ...event.velocity };
            ballStateChanged = true;

            // Calculate all paddle movements for this event in one place
            this.calculateEventMovements(event);

            // Log the event using the appropriate method
            switch (event.type) {
                case EventType.HIT:
                    this.replayLogger.logHitEvent(
                        event.position,
                        event.velocity,
                        event.player,
                        event.paddlePositions.left,
                        event.paddlePositions.right,
                        event.tick
                    );
                    break;
                case EventType.SERVE:
                    this.replayLogger.logServeEvent(
                        event.velocity,
                        event.player,
                        event.paddlePositions.left,
                        event.paddlePositions.right,
                        event.tick
                    );
                    break;
                case EventType.SCORE:
                    this.replayLogger.logScoreEvent(
                        event.position,
                        event.velocity,
                        event.player,
                        event.tick
                    );
                    // Track the score event for the Game to process
                    this.lastProcessedScoreEvent = event;
                    break;
            }

            this.currentEventIndex++;
        }

        // Highlight all events from this tick in the original log
        if (this.originalLogger && eventsInThisTick.length > 0) {
            this.originalLogger.highlightReplayEvents(eventsInThisTick);
        }

        // Set ball state from replay events only if state changed from an event
        if (ballStateChanged && this.ballPosition && this.ballVelocity) {
            ball.position.x = this.ballPosition.x;
            ball.position.y = this.ballPosition.y;
            ball.velocity.x = this.ballVelocity.x;
            ball.velocity.y = this.ballVelocity.y;
        }

        // Check if replay should end (after processing all events)
        if (this.currentEventIndex >= this.events.length) {
            this.stopReplay();
        }
        
        return ballStateChanged;
    }

    stopReplay(): void {
        this.isActive = false;
        this.currentEventIndex = 0;
        
        // Don't clear highlights here - let endReplay() handle it after animation
    }

    getLastProcessedScoreEvent(): GameEvent | null {
        return this.lastProcessedScoreEvent;
    }
}
