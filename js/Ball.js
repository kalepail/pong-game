import { Vec2 } from './Vec2.js';

export class Ball {
    constructor(canvas) {
        this.canvas = canvas;
        this.radius = 8;
        // Don't reset in constructor - let Game.start() handle initial position
        this.position = new Vec2(canvas.width / 2, canvas.height / 2);
        this.velocity = new Vec2(0, 0);
    }

    reset(servingSide = 'left') {
        // Always serve from the center of the playfield
        this.position = new Vec2(
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        const angle = servingSide === 'left' 
            ? (Math.random() * 0.5 - 0.25) 
            : Math.PI + (Math.random() * 0.5 - 0.25);
        const speed = 300;
        this.velocity = new Vec2(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
    }

    update(deltaTime) {
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Check wall collisions (top and bottom)
        if (this.position.y - this.radius <= 0) {
            this.position.y = this.radius;
            this.velocity.y = Math.abs(this.velocity.y);
        } else if (this.position.y + this.radius >= this.canvas.height) {
            this.position.y = this.canvas.height - this.radius;
            this.velocity.y = -Math.abs(this.velocity.y);
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#0f0';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    isOutOfBounds() {
        return this.position.x < -this.radius ||
               this.position.x > this.canvas.width + this.radius;
    }

    getScoringPlayer() {
        return this.position.x < 0 ? 'right' : 'left';
    }
}