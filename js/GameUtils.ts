import { Vec2 } from './Vec2.ts';
import { GAME_CONSTANTS } from './constants.ts';

/**
 * Utility functions for common game positioning and canvas calculations
 * Eliminates duplicate code across Game, Ball, Paddle, and Engine classes
 */
export class GameUtils {
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
}
