// Shared constants
export const BALL_RADIUS = 8;
export const PADDLE_SPEED = 300;
export const MAX_BOUNCE_ANGLE = Math.PI / 3;
export const DODGE_CLEARANCE = 15;

// Utility functions
export function mod(a, n) {
    return ((a % n) + n) % n;
}

export function predictBallYAtX(targetX, height, startPos, velocity) {
    const { x: x0, y: y0 } = startPos;
    const { x: vx, y: vy } = velocity;
    
    if (Math.abs(vx) < 1e-12) return null;
    
    const timeToTarget = (targetX - x0) / vx;
    if (timeToTarget <= 0) return null;
    
    const yUnfolded = y0 + vy * timeToTarget;
    const period = 2 * height;
    const m = mod(yUnfolded, period);
    
    let yAtTarget;
    if (m < height) {
        yAtTarget = m;
    } else {
        yAtTarget = 2 * height - m;
    }
    
    return Math.min(Math.max(yAtTarget, 0), height);
}

export function calculateHitTargetY(event, paddleHeight, canvasHeight) {
    const speed = Math.sqrt(event.velocity.x ** 2 + event.velocity.y ** 2);
    const bounceAngle = Math.asin(Math.min(1, Math.max(-1, event.velocity.y / speed)));
    const hitPosition = bounceAngle / MAX_BOUNCE_ANGLE;
    const paddleCenter = event.position.y - hitPosition * paddleHeight / 2;
    const targetY = paddleCenter - paddleHeight / 2;
    return Math.max(0, Math.min(canvasHeight - paddleHeight, targetY));
}

export function calculateDodgeTarget(ballYAtPaddle, paddle, canvasHeight) {
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;
    
    // Check if paddle is currently in the ball's path
    const ballWillHit = (ballYAtPaddle - BALL_RADIUS <= paddleBottom) && 
                       (ballYAtPaddle + BALL_RADIUS >= paddleTop);
    
    if (!ballWillHit) {
        return undefined; // No dodge needed
    }
    
    // Calculate dodge positions
    const dodgeUp = ballYAtPaddle - BALL_RADIUS - DODGE_CLEARANCE - paddle.height;
    const dodgeDown = ballYAtPaddle + BALL_RADIUS + DODGE_CLEARANCE;
    
    // Check which positions are achievable
    const canDodgeUp = dodgeUp >= 0;
    const canDodgeDown = dodgeDown + paddle.height <= canvasHeight;
    
    // Choose based on which is possible and closer
    const distanceUp = Math.abs(dodgeUp - paddle.y);
    const distanceDown = Math.abs(dodgeDown - paddle.y);
    
    let target;
    if (canDodgeUp && canDodgeDown) {
        target = distanceUp < distanceDown ? dodgeUp : dodgeDown;
    } else if (canDodgeUp) {
        target = dodgeUp;
    } else if (canDodgeDown) {
        target = dodgeDown;
    } else {
        // Can't fully dodge - move as far as possible
        const paddleCenter = paddleTop + paddle.height / 2;
        target = paddleCenter < ballYAtPaddle ? 0 : canvasHeight - paddle.height;
    }
    
    return Math.max(0, Math.min(canvasHeight - paddle.height, target));
}