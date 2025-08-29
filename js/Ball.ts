import { Vec2 } from './Vec2.ts';
import { PaddleSide } from './types.ts';
import { GAME_CONSTANTS } from './constants.ts';
import { GameUtils } from './GameUtils.ts';

export class Ball {
    canvas: HTMLCanvasElement;
    radius: number;
    position: Vec2;
    velocity: Vec2;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.radius = GAME_CONSTANTS.BALL_RADIUS;
        this.position = GameUtils.getCanvasCenter(canvas);
        this.velocity = new Vec2(0, 0);
    }

    reset(servingSide: PaddleSide = 'left'): void {
        this.position = GameUtils.getCanvasCenter(this.canvas);
        const baseAngle = servingSide === 'left' ? 0 : Math.PI;
        const angleVariation = (Math.random() * GAME_CONSTANTS.BALL_SERVE_ANGLE_VARIATION - GAME_CONSTANTS.BALL_SERVE_ANGLE_VARIATION / 2);
        const angle = baseAngle + angleVariation;
        const speed = GAME_CONSTANTS.BALL_INITIAL_SPEED;
        this.velocity = new Vec2(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
    }

    update(deltaTime: number): void {
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        if (this.position.y - this.radius <= 0) {
            this.position.y = this.radius;
            this.velocity.y = Math.abs(this.velocity.y);
        } else if (this.position.y + this.radius >= this.canvas.height) {
            this.position.y = this.canvas.height - this.radius;
            this.velocity.y = -Math.abs(this.velocity.y);
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawAt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(x, y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    isOutOfBounds(): boolean {
        return this.position.x < -this.radius ||
               this.position.x > this.canvas.width + this.radius;
    }

    getScoringPlayer(): PaddleSide {
        return this.position.x < 0 ? 'right' : 'left';
    }
}
