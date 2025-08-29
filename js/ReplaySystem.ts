import { EventLogger } from './EventLogger.ts';
import { GameEvent, Ball, Paddle } from './types.ts';
import { Vec2 } from './Vec2.ts';

interface PendingMove {
    targetY: number;
    eventIndex: number;
    type: 'hit' | 'miss' | 'position_for_next_hit' | 'position_for_serve_followup';
    executed: boolean;
}

interface PaddleTargets {
    left: Vec2 | null;
    right: Vec2 | null;
}

interface PendingMoves {
    left: PendingMove | null;
    right: PendingMove | null;
}

export class ReplaySystem {
    canvas: HTMLCanvasElement;
    events: GameEvent[];
    currentEventIndex: number;
    replayStartTime: number | null;
    isActive: boolean;
    ballPosition: Vec2 | null;
    ballVelocity: Vec2 | null;
    replayLogger: EventLogger;
    paddleTargets: PaddleTargets;
    pendingMoves: PendingMoves;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.events = [];
        this.currentEventIndex = 0;
        this.replayStartTime = null;
        this.isActive = false;
        this.ballPosition = null;
        this.ballVelocity = null;
        this.replayLogger = new EventLogger('replayLogContent');
        this.paddleTargets = { left: null, right: null };
        this.pendingMoves = { left: null, right: null };
    }

    calculateBallY(targetX: number, ball: { position: Vec2; velocity: Vec2; radius: number }): number | null {
        const dx = targetX - ball.position.x;
        const vx = ball.velocity.x;
        
        if (Math.abs(vx) < 0.001 || (dx * vx) < 0) return null;
        
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

    paddleWouldIntercept(ball: { position: Vec2; velocity: Vec2; radius: number }, side: 'left' | 'right', currentPaddleY: number): boolean {
        const paddleHeight = 80;
        const paddleWidth = 10;
        const paddleOffset = side === 'left' ? 30 : this.canvas.width - 40;
        
        const paddleFaceX = side === 'left' ? paddleOffset + paddleWidth : paddleOffset;
        const paddleTop = currentPaddleY;
        const paddleBottom = currentPaddleY + paddleHeight;
        
        const ballY = this.calculateBallY(paddleFaceX, ball);
        if (ballY === null) return false;
        
        const ballTop = ballY - ball.radius;
        const ballBottom = ballY + ball.radius;
        
        return ballBottom >= paddleTop && ballTop <= paddleBottom;
    }

    calculateMissPosition(ball: { position: Vec2; velocity: Vec2; radius: number }, missingSide: 'left' | 'right', currentPaddleY: number | null = null): { targetY: number } {
        const paddleHeight = 80;
        const paddleWidth = 10;
        const paddleOffset = missingSide === 'left' ? 30 : this.canvas.width - 40;
        
        const paddleFaceX = missingSide === 'left' ? paddleOffset + paddleWidth : paddleOffset;
        
        const ballHitY = this.calculateBallY(paddleFaceX, ball);
        if (ballHitY === null) return { targetY: this.canvas.height / 2 - paddleHeight / 2 };
        
        const ballTop = ballHitY - ball.radius;
        const ballBottom = ballHitY + ball.radius;
        
        const minCatchY = ballTop - paddleHeight;
        const maxCatchY = ballBottom;
        
        const safetyMargin = paddleHeight * 0.2;
        
        const avoidAbove = minCatchY - safetyMargin;
        const avoidBelow = maxCatchY + safetyMargin;
        
        if (currentPaddleY === null) {
            currentPaddleY = this.canvas.height / 2 - paddleHeight / 2;
        }
        
        let targetY: number;
        
        if (avoidAbove >= 0) {
            if (avoidBelow + paddleHeight <= this.canvas.height) {
                const distanceAbove = Math.abs(currentPaddleY - avoidAbove);
                const distanceBelow = Math.abs(currentPaddleY - avoidBelow);
                targetY = distanceAbove <= distanceBelow ? avoidAbove : avoidBelow;
            } else {
                targetY = avoidAbove;
            }
        } else if (avoidBelow + paddleHeight <= this.canvas.height) {
            targetY = avoidBelow;
        } else {
            const distanceFromTop = Math.abs(ballHitY - 0);
            const distanceFromBottom = Math.abs(ballHitY - this.canvas.height);
            targetY = distanceFromTop > distanceFromBottom ? 0 : this.canvas.height - paddleHeight;
        }
        
        targetY = Math.max(0, Math.min(this.canvas.height - paddleHeight, targetY));
        
        return { targetY };
    }

    calculateOptimalPaddlePosition(hitEvent: GameEvent, paddleHeight: number): { paddleTop: number; hitPosition: number; collisionPoint: { x: number; y: number } } {
        const collisionY = hitEvent.position.y;
        
        const targetVx = hitEvent.velocity.x;
        const targetVy = hitEvent.velocity.y;
        
        const requiredAngle = Math.atan2(targetVy, Math.abs(targetVx));
        
        const maxBounceAngle = Math.PI / 3;
        const normalizedPosition = Math.max(-0.8, Math.min(0.8, requiredAngle / maxBounceAngle));
        const hitPosition = (normalizedPosition + 1) / 2;
        
        const paddleTop = collisionY - (hitPosition * paddleHeight);
        
        return {
            paddleTop: paddleTop,
            hitPosition: hitPosition,
            collisionPoint: { x: hitEvent.position.x, y: collisionY }
        };
    }

    analyzeUpcomingEvents(ball: { position: Vec2; velocity: Vec2; radius: number }, leftPaddle: Paddle, rightPaddle: Paddle): void {
        for (let i = this.currentEventIndex; i < this.events.length; i++) {
            const event = this.events[i];
            
            if (event.type === 'hit') {
                const side = event.player as 'left' | 'right';
                
                if (!this.pendingMoves[side]) {
                    const paddleHeight = 80;
                    const optimalPosition = this.calculateOptimalPaddlePosition(event, paddleHeight);
                    
                    this.pendingMoves[side] = {
                        targetY: optimalPosition.paddleTop,
                        eventIndex: i,
                        type: 'hit',
                        executed: false
                    };
                }
                break;

            } else if (event.type === 'score') {
                const ballMovingLeft = ball.velocity.x < 0;
                const missingSide = ballMovingLeft ? 'left' : 'right';
                
                if (!this.pendingMoves[missingSide]) {
                    const currentPaddle = missingSide === 'left' ? leftPaddle : rightPaddle;
                    const needsToMove = this.paddleWouldIntercept(ball, missingSide, currentPaddle.y);
                    
                    if (needsToMove) {
                        const missPosition = this.calculateMissPosition(ball, missingSide, currentPaddle.y);
                        
                        this.pendingMoves[missingSide] = {
                            targetY: missPosition.targetY,
                            eventIndex: i,
                            type: 'miss',
                            executed: false
                        };
                    }
                }
                break;
            }
        }
    }

    movePaddle(paddle: Paddle, deltaTime: number): void {
        const pendingMove = this.pendingMoves[paddle.side as 'left' | 'right'];
        if (!pendingMove) return;
        
        const targetY = pendingMove.targetY;
        const currentY = paddle.y;
        const paddleSpeed = 400;
        
        const distance = targetY - currentY;
        
        if (Math.abs(distance) < paddleSpeed * deltaTime) {
            paddle.y = Math.max(0, Math.min(this.canvas.height - paddle.height, targetY));
            pendingMove.executed = true;
            
            if (pendingMove.type === 'position_for_next_hit' || pendingMove.type === 'position_for_serve_followup') {
                this.pendingMoves[paddle.side as 'left' | 'right'] = null;
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
        this.replayStartTime = Date.now();
        this.isActive = true;
        this.replayLogger.reset();
        this.pendingMoves = { left: null, right: null };

        if (this.events.length > 0) {
            const firstEvent = this.events[0];
            this.ballPosition = { ...firstEvent.position };
            this.ballVelocity = { ...firstEvent.velocity };
        }
    }

    update(deltaTime: number, ball: Ball, leftPaddle: Paddle, rightPaddle: Paddle): void {
        if (!this.isActive || this.events.length === 0) return;

        const currentTime = Date.now() - this.replayStartTime!;

        this.analyzeUpcomingEvents(ball, leftPaddle, rightPaddle);

        this.movePaddle(leftPaddle, deltaTime);
        this.movePaddle(rightPaddle, deltaTime);

        while (this.currentEventIndex < this.events.length &&
               this.events[this.currentEventIndex].timestamp <= currentTime) {

            const event = this.events[this.currentEventIndex];
            this.ballPosition = { ...event.position };
            this.ballVelocity = { ...event.velocity };

            if (event.type === 'hit') {
                this.pendingMoves[event.player as 'left' | 'right'] = null;
                
                const currentPlayer = event.player as 'left' | 'right';
                const otherPlayer = currentPlayer === 'left' ? 'right' : 'left';
                
                for (let i = this.currentEventIndex + 1; i < this.events.length; i++) {
                    const nextEvent = this.events[i];
                    if (nextEvent.type === 'hit' && nextEvent.player === otherPlayer && nextEvent.targetPaddlePosition) {
                        const paddleHeight = 80;
                        const targetY = nextEvent.targetPaddlePosition.y - paddleHeight / 2;
                        const clampedTargetY = Math.max(0, Math.min(this.canvas.height - paddleHeight, targetY));
                        
                        this.pendingMoves[currentPlayer] = {
                            targetY: clampedTargetY,
                            eventIndex: i,
                            type: 'position_for_next_hit',
                            executed: false
                        };
                        break;
                    }
                }
            } else if (event.type === 'serve') {
                this.pendingMoves['left'] = null;
                this.pendingMoves['right'] = null;
                
                const servingPlayer = event.player as 'left' | 'right';
                const receivingPlayer = servingPlayer === 'left' ? 'right' : 'left';
                
                for (let i = this.currentEventIndex + 1; i < this.events.length; i++) {
                    const nextEvent = this.events[i];
                    if (nextEvent.type === 'hit' && nextEvent.player === receivingPlayer && nextEvent.targetPaddlePosition) {
                        const paddleHeight = 80;
                        const targetY = nextEvent.targetPaddlePosition.y - paddleHeight / 2;
                        const clampedTargetY = Math.max(0, Math.min(this.canvas.height - paddleHeight, targetY));
                        
                        this.pendingMoves[servingPlayer] = {
                            targetY: clampedTargetY,
                            eventIndex: i,
                            type: 'position_for_serve_followup',
                            executed: false
                        };
                        break;
                    }
                }
            } else if (event.type === 'score') {
                const ballMovingLeft = this.ballVelocity!.x < 0;
                const missingSide = ballMovingLeft ? 'left' : 'right';
                this.pendingMoves[missingSide] = null;
            }

            this.replayLogger.logEvent(
                event.type,
                event.position,
                event.velocity,
                event.player,
                event.targetPaddlePosition
            );

            this.currentEventIndex++;
        }

        if (this.ballPosition && this.ballVelocity) {
            ball.position.x = this.ballPosition.x;
            ball.position.y = this.ballPosition.y;
            ball.velocity.x = this.ballVelocity.x;
            ball.velocity.y = this.ballVelocity.y;

            ball.update(deltaTime);

            this.ballPosition = { x: ball.position.x, y: ball.position.y };
            this.ballVelocity = { x: ball.velocity.x, y: ball.velocity.y };
        }

        if (this.currentEventIndex >= this.events.length &&
            currentTime > this.events[this.events.length - 1].timestamp + 2000) {
            this.stopReplay();
        }
    }

    stopReplay(): void {
        this.isActive = false;
        this.currentEventIndex = 0;
    }
}
