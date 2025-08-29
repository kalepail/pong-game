import { Vec2 } from '../classes/Vec2.ts';
import { GAME_CONSTANTS, REPLAY_CONFIG } from '../constants.ts';

/**
 * Utility functions for common game positioning and canvas calculations
 * Eliminates duplicate code across Game, Ball, Paddle, and Engine classes
 */
export class GameUtils {
    // Cached calculated constants - computed once, reused many times
    private static readonly _paddleFaceXLeft = GAME_CONSTANTS.PADDLE_OFFSET + GAME_CONSTANTS.PADDLE_WIDTH;
    private static readonly _paddleFaceXRight = GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.PADDLE_OFFSET - GAME_CONSTANTS.PADDLE_WIDTH;
    private static readonly _tickDuration = 1 / GAME_CONSTANTS.TICKS_PER_SECOND;
    private static readonly _safetyMargin = GAME_CONSTANTS.PADDLE_HEIGHT * REPLAY_CONFIG.SAFETY_MARGIN_RATIO;
    /**
     * Get the center point of the canvas
     */
    static getCanvasCenter(canvas: HTMLCanvasElement): Vec2 {
        return new Vec2(canvas.width / 2, canvas.height / 2);
    }
    
    /**
     * Get the center X coordinate of the canvas
     */
    static getCanvasCenterX(canvas: HTMLCanvasElement): number {
        return canvas.width / 2;
    }
    
    /**
     * Get the center Y coordinate of the canvas
     */
    static getCanvasCenterY(canvas: HTMLCanvasElement): number {
        return canvas.height / 2;
    }
    
    /**
     * Get the default paddle Y position (centered vertically)
     */
    static getPaddleCenterY(canvas: HTMLCanvasElement): number {
        return canvas.height / 2 - GAME_CONSTANTS.PADDLE_HEIGHT / 2;
    }
    
    /**
     * Get the center position of a paddle from its top Y coordinate
     */
    static getPaddleCenterPosition(paddleY: number): number {
        return paddleY + GAME_CONSTANTS.PADDLE_HEIGHT / 2;
    }
    
    /**
     * Clamp paddle Y coordinate within canvas boundaries
     */
    static clampPaddleY(y: number, canvas: HTMLCanvasElement): number {
        return Math.max(0, Math.min(canvas.height - GAME_CONSTANTS.PADDLE_HEIGHT, y));
    }
    
    /**
     * Clamp any value within canvas height boundaries
     */
    static clampToCanvasHeight(y: number, canvas: HTMLCanvasElement): number {
        return Math.max(0, Math.min(canvas.height, y));
    }
    
    /**
     * Get the X position of the left paddle collision face (cached)
     */
    static getPaddleFaceXLeft(): number {
        return GameUtils._paddleFaceXLeft;
    }
    
    /**
     * Get the X position of the right paddle collision face (cached) 
     */
    static getPaddleFaceXRight(): number {
        return GameUtils._paddleFaceXRight;
    }
    
    /**
     * Get the physics tick duration (cached)
     */
    static getTickDuration(): number {
        return GameUtils._tickDuration;
    }
    
    /**
     * Get the safety margin for replay miss calculations (cached)
     */
    static getSafetyMargin(): number {
        return GameUtils._safetyMargin;
    }
}
