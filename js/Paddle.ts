import { Vec2 } from './Vec2.ts';
import { PaddleSide, KeyMap } from './types.ts';

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
        this.width = 10;
        this.height = 80;
        this.x = x;
        this.y = canvas.height / 2 - this.height / 2;
        this.side = side;
        this.velocity = 0;
        this.speed = 400;
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
        
        this.y = Math.max(0, Math.min(this.canvas.height - this.height, this.y));
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
            console.log(`${this.side} paddle HIT! ballX: ${ball.position.x}, paddleFaceX: ${paddleFaceX}`);
            
            const hitPosition = Math.max(0, Math.min(1, (ball.position.y - paddleTop) / this.height));
            const normalizedPosition = Math.max(-0.8, Math.min(0.8, 2 * hitPosition - 1));
            const maxBounceAngle = Math.PI / 3;
            const bounceAngle = normalizedPosition * maxBounceAngle;
            
            const approachSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
            const speed = Math.min(approachSpeed * 1.05, 800);
            
            ball.velocity.x = (this.side === 'left' ? 1 : -1) * Math.cos(bounceAngle) * speed;
            ball.velocity.y = Math.sin(bounceAngle) * speed;
            ball.velocity.y += this.velocity * 0.3;
            
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

    reset(): void {
        this.y = this.canvas.height / 2 - this.height / 2;
        this.velocity = 0;
    }
}
