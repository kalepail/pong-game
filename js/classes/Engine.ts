import { Ball } from './Ball.ts';
import { Paddle } from './Paddle.ts';
import { GameMode, KeyMap, PaddleSide } from '../types.ts';
import { GAME_CONSTANTS } from '../constants.ts';
import { GameUtils } from '../utils/GameUtils.ts';

export interface PhysicsState {
    ball: { x: number; y: number };
    leftPaddle: { y: number };
    rightPaddle: { y: number };
}

export interface CollisionResult {
    leftHit: boolean;
    rightHit: boolean;
    ballOutOfBounds: boolean;
    scoringPlayer?: PaddleSide;
}

export class Engine {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    
    // Tick-based physics simulation - mathematically deterministic
    readonly TICKS_PER_SECOND: number = GAME_CONSTANTS.TICKS_PER_SECOND;
    readonly TICK_DURATION: number = GameUtils.getTickDuration();
    currentTick: number = 0;
    tickTimer: number = 0;
    
    // Physics states for interpolation
    currentState: PhysicsState;
    previousState: PhysicsState;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        
        // Initialize current and previous states
        const centerX = GameUtils.getCanvasCenterX(canvas);
        const centerY = GameUtils.getCanvasCenterY(canvas);
        const paddleCenterY = GameUtils.getPaddleCenterY(canvas);
        
        this.currentState = {
            ball: { x: centerX, y: centerY },
            leftPaddle: { y: paddleCenterY },
            rightPaddle: { y: paddleCenterY }
        };
        this.previousState = {
            ball: { x: centerX, y: centerY },
            leftPaddle: { y: paddleCenterY },
            rightPaddle: { y: paddleCenterY }
        };
    }
    
    syncCurrentState(ball: Ball, leftPaddle: Paddle, rightPaddle: Paddle): void {
        this.currentState.ball.x = ball.position.x;
        this.currentState.ball.y = ball.position.y;
        this.currentState.leftPaddle.y = leftPaddle.y;
        this.currentState.rightPaddle.y = rightPaddle.y;
    }
    
    syncPreviousState(): void {
        this.previousState.ball.x = this.currentState.ball.x;
        this.previousState.ball.y = this.currentState.ball.y;
        this.previousState.leftPaddle.y = this.currentState.leftPaddle.y;
        this.previousState.rightPaddle.y = this.currentState.rightPaddle.y;
    }
    
    /**
     * Sync both current and previous states for discontinuous changes (like ball resets)
     * This eliminates interpolation artifacts when objects teleport/reset
     */
    syncBothStatesForReset(ball: Ball, leftPaddle: Paddle, rightPaddle: Paddle): void {
        this.syncCurrentState(ball, leftPaddle, rightPaddle);
        this.syncPreviousState();
    }
    
    resetStates(): void {
        this.currentTick = 0;
        this.tickTimer = 0;
        
        const centerX = GameUtils.getCanvasCenterX(this.canvas);
        const centerY = GameUtils.getCanvasCenterY(this.canvas);
        const paddleY = GameUtils.getPaddleCenterY(this.canvas);
        
        this.currentState.ball.x = centerX;
        this.currentState.ball.y = centerY;
        this.currentState.leftPaddle.y = paddleY;
        this.currentState.rightPaddle.y = paddleY;
        
        this.previousState.ball.x = centerX;
        this.previousState.ball.y = centerY;
        this.previousState.leftPaddle.y = paddleY;
        this.previousState.rightPaddle.y = paddleY;
    }
    
    updatePhysicsTick(
        ball: Ball, 
        leftPaddle: Paddle, 
        rightPaddle: Paddle, 
        keys: KeyMap,
        mode: GameMode
    ): CollisionResult {
        const result: CollisionResult = {
            leftHit: false,
            rightHit: false,
            ballOutOfBounds: false
        };
        
        if (mode === 'play') {
            // Update paddles with exact tick duration for deterministic movement
            leftPaddle.update(this.TICK_DURATION, keys);
            rightPaddle.update(this.TICK_DURATION, keys);

            // Check collisions before ball movement for precise detection
            if (leftPaddle.checkCollision(ball)) {
                result.leftHit = true;
            }

            if (rightPaddle.checkCollision(ball)) {
                result.rightHit = true;
            }

            // Update ball with exact tick duration for deterministic physics
            ball.update(this.TICK_DURATION);

            if (ball.isOutOfBounds()) {
                result.ballOutOfBounds = true;
                result.scoringPlayer = ball.getScoringPlayer();
            }
        } else if (mode === 'replay') {
            // In replay mode, ball physics and collision detection handled differently
            // Just update ball physics - collision detection happens via events
            ball.update(this.TICK_DURATION);
            
            if (ball.isOutOfBounds()) {
                result.ballOutOfBounds = true;
                result.scoringPlayer = ball.getScoringPlayer();
            }
        }
        
        return result;
    }
    
    processPhysicsTicks(
        frameTime: number,
        ball: Ball,
        leftPaddle: Paddle,
        rightPaddle: Paddle,
        keys: KeyMap,
        mode: GameMode,
        onPhysicsTick: (result: CollisionResult) => void
    ): void {
        // Accumulate time for tick-based physics
        this.tickTimer += frameTime;
        
        // Run discrete physics ticks at exactly 60Hz - mathematically deterministic
        while (this.tickTimer >= this.TICK_DURATION) {
            // Save previous state before physics update
            this.syncPreviousState();
            
            // Update physics for one discrete tick with exact timing
            const result = this.updatePhysicsTick(ball, leftPaddle, rightPaddle, keys, mode);
            
            // Update current state from game objects
            this.syncCurrentState(ball, leftPaddle, rightPaddle);
            
            // Increment tick counter (always integer, never floating point)
            this.currentTick++;
            
            // Subtract exact tick duration to maintain precision
            this.tickTimer -= this.TICK_DURATION;
            
            // Notify caller of physics events
            onPhysicsTick(result);
        }
    }
    
    renderInterpolated(
        ball: Ball,
        leftPaddle: Paddle,
        rightPaddle: Paddle,
        isRunning: boolean
    ): void {
        // Calculate interpolation factor for smooth visual rendering
        const alpha = isRunning ? (this.tickTimer / this.TICK_DURATION) : 0;
        
        // Clear canvas
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw center line
        this.ctx.strokeStyle = '#0f0';
        this.ctx.setLineDash([GAME_CONSTANTS.DASH_LENGTH, GAME_CONSTANTS.DASH_LENGTH]);
        this.ctx.beginPath();
        const centerX = GameUtils.getCanvasCenterX(this.canvas);
        this.ctx.moveTo(centerX, 0);
        this.ctx.lineTo(centerX, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Interpolate positions for smooth rendering (always forward progression)
        const ballX = this.previousState.ball.x + (this.currentState.ball.x - this.previousState.ball.x) * alpha;
        const ballY = this.previousState.ball.y + (this.currentState.ball.y - this.previousState.ball.y) * alpha;
        const leftPaddleY = this.previousState.leftPaddle.y + (this.currentState.leftPaddle.y - this.previousState.leftPaddle.y) * alpha;
        const rightPaddleY = this.previousState.rightPaddle.y + (this.currentState.rightPaddle.y - this.previousState.rightPaddle.y) * alpha;
        
        // Draw paddles at interpolated positions
        leftPaddle.drawAt(this.ctx, leftPaddle.x, leftPaddleY);
        rightPaddle.drawAt(this.ctx, rightPaddle.x, rightPaddleY);
        
        // Draw ball at interpolated position
        ball.drawAt(this.ctx, ballX, ballY);
    }
    
    render(ball: Ball, leftPaddle: Paddle, rightPaddle: Paddle): void {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.strokeStyle = '#0f0';
        this.ctx.setLineDash([GAME_CONSTANTS.DASH_LENGTH, GAME_CONSTANTS.DASH_LENGTH]);
        this.ctx.beginPath();
        const centerX = GameUtils.getCanvasCenterX(this.canvas);
        this.ctx.moveTo(centerX, 0);
        this.ctx.lineTo(centerX, this.canvas.height);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        leftPaddle.draw(this.ctx);
        rightPaddle.draw(this.ctx);
        ball.draw(this.ctx);
    }
    
    // Physics utility methods for replay system
    
    /**
     * Predicts ball Y position at a given X coordinate, accounting for wall bounces
     * Preserves all original physics calculations from ReplaySystem
     */
    predictBallY(targetX: number, ball: { position: { x: number; y: number }; velocity: { x: number; y: number }; radius: number }): number | null {
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
    
    /**
     * Checks if paddle would intercept ball at its current trajectory
     * Preserves all collision detection logic from ReplaySystem
     */
    wouldPaddleIntercept(ball: { position: { x: number; y: number }; velocity: { x: number; y: number }; radius: number }, side: PaddleSide, paddleY: number): boolean {
        const paddleFaceX = side === 'left' 
            ? GameUtils.getPaddleFaceXLeft()
            : GameUtils.getPaddleFaceXRight();
        const paddleTop = paddleY;
        const paddleBottom = paddleY + GAME_CONSTANTS.PADDLE_HEIGHT;
        
        const ballY = this.predictBallY(paddleFaceX, ball);
        if (ballY === null) return false;
        
        const ballTop = ballY - ball.radius;
        const ballBottom = ballY + ball.radius;
        
        return ballBottom >= paddleTop && ballTop <= paddleBottom;
    }
    
    /**
     * Moves paddle toward target position with speed constraints
     * Preserves all movement physics from ReplaySystem
     */
    movePaddleToTarget(paddle: Paddle, targetY: number, deltaTime: number): { reached: boolean } {
        const currentY = paddle.y;
        const paddleSpeed = GAME_CONSTANTS.PADDLE_SPEED;
        
        const distance = targetY - currentY;
        
        if (Math.abs(distance) < paddleSpeed * deltaTime) {
            paddle.y = GameUtils.clampPaddleY(targetY, this.canvas);
            return { reached: true };
        } else {
            const direction = Math.sign(distance);
            const newY = currentY + direction * paddleSpeed * deltaTime;
            paddle.y = GameUtils.clampPaddleY(newY, this.canvas);
            return { reached: false };
        }
    }
    
    /**
     * Calculates position for paddle to avoid hitting the ball (miss calculation)
     * Preserves all safety margin and avoidance logic from ReplaySystem
     */
    calculateMissPosition(ball: { position: { x: number; y: number }; velocity: { x: number; y: number }; radius: number }, missingSide: PaddleSide, currentPaddleY: number | null = null): { targetY: number } {
        const paddleFaceX = missingSide === 'left' 
            ? GameUtils.getPaddleFaceXLeft()
            : GameUtils.getPaddleFaceXRight();
        
        const ballHitY = this.predictBallY(paddleFaceX, ball);
        if (ballHitY === null) return { targetY: GameUtils.getPaddleCenterY(this.canvas) };
        
        const ballTop = ballHitY - ball.radius;
        const ballBottom = ballHitY + ball.radius;
        
        const minCatchY = ballTop - GAME_CONSTANTS.PADDLE_HEIGHT;
        const maxCatchY = ballBottom;
        
        const safetyMargin = GameUtils.getSafetyMargin();
        
        const avoidAbove = minCatchY - safetyMargin;
        const avoidBelow = maxCatchY + safetyMargin;
        
        if (currentPaddleY === null) {
            currentPaddleY = GameUtils.getPaddleCenterY(this.canvas);
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
        
        targetY = GameUtils.clampPaddleY(targetY, this.canvas);
        
        return { targetY };
    }
}
