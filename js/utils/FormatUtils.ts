import { Vec2 } from '../classes/Vec2.ts';

/**
 * Utility functions for consistent formatting across the application
 * Used primarily in EventLogger for display purposes
 */
export class FormatUtils {
    /**
     * Format a Vec2 position for display with rounded coordinates
     */
    static formatPosition(pos: Vec2): string {
        return `(${Math.round(pos.x)}, ${Math.round(pos.y)})`;
    }
    
    /**
     * Format a Vec2 velocity for display with rounded coordinates
     */
    static formatVelocity(vel: Vec2): string {
        return `(${Math.round(vel.x)}, ${Math.round(vel.y)})`;
    }
    
    /**
     * Format a number with specified decimal places
     */
    static formatNumber(num: number, decimals: number = 0): string {
        return num.toFixed(decimals);
    }
    
    /**
     * Format a player name with proper capitalization
     */
    static formatPlayer(player: string): string {
        return player.charAt(0).toUpperCase() + player.slice(1);
    }
    
    /**
     * Format tick number for display
     */
    static formatTick(tick: number): string {
        return `T${tick}`;
    }
    
    /**
     * Round coordinate for display purposes
     */
    static roundCoordinate(coord: number): number {
        return Math.round(coord);
    }
}
