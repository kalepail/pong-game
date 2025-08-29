import { Vec2 } from './Vec2.js';

export class Paddle {
    constructor(canvas, x, side) {
        this.canvas = canvas;
        this.width = 10;
        this.height = 80;
        this.x = x;
        this.y = canvas.height / 2 - this.height / 2;
        this.side = side;
        this.velocity = 0;
        this.speed = 400;
    }

    update(deltaTime, keys) {
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
        
        // Keep paddle on screen
        this.y = Math.max(0, Math.min(this.canvas.height - this.height, this.y));
        
        // Calculate velocity for collision physics
        this.velocity = (this.y - prevY) / deltaTime;
    }

    checkCollision(ball) {
        // Paddle front face position (vertical line)
        const paddleFaceX = this.side === 'left' ? this.x + this.width : this.x;
        const paddleTop = this.y;
        const paddleBottom = this.y + this.height;
        const ballRadius = ball.radius;
        
        // Check if ball is within collision range of the paddle face
        const distanceToFace = Math.abs(ball.position.x - paddleFaceX);
        if (distanceToFace > ballRadius) return false;
        
        // Check if ball overlaps paddle vertically
        const ballTop = ball.position.y - ballRadius;
        const ballBottom = ball.position.y + ballRadius;
        
        if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
            console.log(`${this.side} paddle HIT! ballX: ${ball.position.x}, paddleFaceX: ${paddleFaceX}`);
            
            // Calculate hit position on paddle (0 = top, 1 = bottom)
            const hitPosition = Math.max(0, Math.min(1, (ball.position.y - paddleTop) / this.height));
            
            // Map to bounce angle (-1 to 1), clamped to prevent extreme angles
            const normalizedPosition = Math.max(-0.8, Math.min(0.8, 2 * hitPosition - 1));
            
            // Max bounce angle (60 degrees, reduced by clamping)
            const maxBounceAngle = Math.PI / 3;
            const bounceAngle = normalizedPosition * maxBounceAngle;
            
            // Calculate new velocity - preserve approach speed characteristics
            const approachSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
            const speed = Math.min(approachSpeed * 1.05, 800); // Small speed increase, capped
            
            ball.velocity.x = (this.side === 'left' ? 1 : -1) * Math.cos(bounceAngle) * speed;
            ball.velocity.y = Math.sin(bounceAngle) * speed;
            
            // Add paddle velocity influence
            ball.velocity.y += this.velocity * 0.3;
            
            // Position ball at collision point
            ball.position.x = paddleFaceX + (this.side === 'left' ? ballRadius : -ballRadius);
            ball.position.y = ball.position.y;
            
            return true;
        }
        
        return false;
    }

    draw(ctx) {
        ctx.fillStyle = '#0f0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    reset() {
        this.y = this.canvas.height / 2 - this.height / 2;
        this.velocity = 0;
    }
}