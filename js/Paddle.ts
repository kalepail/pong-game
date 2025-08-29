import { Vec2 } from './Vec2.ts';
import { PaddleSide, KeyMap } from './types.ts';
import { GAME_CONSTANTS } from './constants.ts';
import { GameUtils } from './GameUtils.ts';
import { PhysicsUtils } from './PhysicsUtils.ts';

export class Paddle {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    x: number;
    y: number;
    side: PaddleSide;
    velocity: number;
    speed: number;

    constructor(canvas: HTMLCanvasElement, x: number, side: PaddleSide) {
        this.canvas = canvas;
        this.width = GAME_CONSTANTS.PADDLE_WIDTH;
        this.height = GAME_CONSTANTS.PADDLE_HEIGHT;
        this.x = x;
        this.y = GameUtils.getPaddleCenterY(canvas);
        this.side = side;
        this.velocity = 0;
        this.speed = GAME_CONSTANTS.PADDLE_SPEED;
    }

    update(deltaTime: number, keys: KeyMap): void {
        const prevY = this.y;
        
        if (this.side === 'left') {
            if (keys['w'] || keys['W']) {
                this.y -= this.speed * deltaTime;
            }
            if (keys['s'] || keys['S']) {
                this.y += this.speed * deltaTime;
            }
        } else {
            if (keys['ArrowUp']) {
                this.y -= this.speed * deltaTime;
            }
            if (keys['ArrowDown']) {
                this.y += this.speed * deltaTime;
            }
        }
        
        this.y = GameUtils.clampPaddleY(this.y, this.canvas);
        this.velocity = (this.y - prevY) / deltaTime;
    }

    checkCollision(ball: { position: Vec2; velocity: Vec2; radius: number }): boolean {
        const paddleFaceX = this.side === 'left' ? this.x + this.width : this.x;
        const paddleTop = this.y;
        const paddleBottom = this.y + this.height;
        const ballRadius = ball.radius;
        
        const distanceToFace = Math.abs(ball.position.x - paddleFaceX);
        if (distanceToFace > ballRadius) return false;
        
        const ballTop = ball.position.y - ballRadius;
        const ballBottom = ball.position.y + ballRadius;
        
        if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
            const hitPosition = PhysicsUtils.calculateHitPosition(ball.position.y, paddleTop, this.height);
            const normalizedPosition = PhysicsUtils.calculateNormalizedPosition(hitPosition);
            const bounceAngle = PhysicsUtils.calculateBounceAngle(normalizedPosition);
            
            const approachSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
            const speed = PhysicsUtils.calculatePostCollisionSpeed(approachSpeed);
            
            ball.velocity.x = (this.side === 'left' ? 1 : -1) * Math.cos(bounceAngle) * speed;
            ball.velocity.y = Math.sin(bounceAngle) * speed;
            ball.velocity.y = PhysicsUtils.applyPaddleVelocityTransfer(ball.velocity.y, this.velocity);
            
            ball.position.x = paddleFaceX + (this.side === 'left' ? ballRadius : -ballRadius);
            ball.position.y = ball.position.y;
            
            return true;
        }
        
        return false;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
    
    drawAt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(x, y, this.width, this.height);
    }

    reset(): void {
        this.y = GameUtils.getPaddleCenterY(this.canvas);
        this.velocity = 0;
    }
}
