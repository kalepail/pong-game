import { GAME_CONSTANTS } from '../constants.ts';

/**
 * Utility functions for physics calculations
 * Consolidates bounce angle and collision physics across Paddle and ReplaySystem
 */
export class PhysicsUtils {
    /**
     * Calculate normalized position from hit position (0-1 range to -1 to 1 range)
     * Used for determining bounce angle based on where ball hits paddle
     */
    static calculateNormalizedPosition(hitPosition: number): number {
        const normalizedPosition = 2 * hitPosition - 1; // Convert 0-1 to -1 to 1
        return Math.max(
            -GAME_CONSTANTS.NORMALIZED_POSITION_LIMIT, 
            Math.min(GAME_CONSTANTS.NORMALIZED_POSITION_LIMIT, normalizedPosition)
        );
    }
    
    /**
     * Calculate bounce angle from normalized position
     * Returns angle in radians
     */
    static calculateBounceAngle(normalizedPosition: number): number {
        return normalizedPosition * GAME_CONSTANTS.MAX_BOUNCE_ANGLE;
    }
    
    /**
     * Calculate hit position on paddle from ball Y and paddle bounds
     * Returns value between 0 (top of paddle) and 1 (bottom of paddle)
     */
    static calculateHitPosition(ballY: number, paddleTop: number, paddleHeight: number): number {
        return Math.max(0, Math.min(1, (ballY - paddleTop) / paddleHeight));
    }
    
    /**
     * Calculate ball speed after collision with speed increase factor
     */
    static calculatePostCollisionSpeed(currentSpeed: number): number {
        return currentSpeed * GAME_CONSTANTS.BALL_SPEED_INCREASE_FACTOR;
    }
    
    /**
     * Apply velocity transfer from paddle to ball
     */
    static applyPaddleVelocityTransfer(ballVelocityY: number, paddleVelocity: number): number {
        return ballVelocityY + paddleVelocity * GAME_CONSTANTS.PADDLE_VELOCITY_TRANSFER;
    }
}
