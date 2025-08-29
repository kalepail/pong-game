// Common gameplay constants shared across the game
export const GAME_CONSTANTS = {
    // Paddle dimensions and positioning
    PADDLE_HEIGHT: 80,
    PADDLE_WIDTH: 10, // Visual only - not used in collision calculations
    PADDLE_OFFSET_LEFT: 30,
    PADDLE_OFFSET_RIGHT: 40, // Distance from right edge
    PADDLE_SPEED: 400,
    
    // Ball physics
    BALL_RADIUS: 8,
    BALL_INITIAL_SPEED: 300,
    BALL_SPEED_INCREASE_FACTOR: 1.05,
    BALL_MAX_SPEED: 800,
    BALL_SERVE_ANGLE_VARIATION: 0.5, // ±25% of π/4 radians
    
    // Paddle physics
    PADDLE_VELOCITY_TRANSFER: 0.3, // How much paddle velocity affects ball
    MAX_NORMALIZED_POSITION: 0.8, // Maximum paddle hit position for angle calculation
    MIN_NORMALIZED_POSITION: -0.8, // Minimum paddle hit position for angle calculation
    
    // Physics constants
    MAX_BOUNCE_ANGLE: Math.PI / 3, // 60 degrees
    
    // Game rules
    MAX_SCORE: 5, // Points needed to win
    
    // Game timing
    TICK_DURATION: 1/60, // 60 FPS
    TICKS_PER_SECOND: 60,
    
    // Visual constants
    DASH_LENGTH: 5, // For center line dashes
    POSITION_TOLERANCE: 5, // For replay comparison
} as const;

// Replay-specific configuration
export const REPLAY_CONFIG = {
    // Miss calculation tolerances
    SAFETY_MARGIN_RATIO: 0.2, // 20% of paddle height
    VELOCITY_TOLERANCE: 0.001,
    

    
    // Collision detection buffer (2 second buffer for replay end)
    REPLAY_END_BUFFER_TICKS: 120,
} as const;

// Derived constants (calculated from base constants)
export const DERIVED_CONSTANTS = {
    get PADDLE_FACE_X_LEFT() {
        return GAME_CONSTANTS.PADDLE_OFFSET_LEFT; // Left paddle face is at the offset
    },
    
    get PADDLE_FACE_X_RIGHT() {
        // Right paddle face position will be calculated using canvas width - offset
        return (canvasWidth: number) => canvasWidth - GAME_CONSTANTS.PADDLE_OFFSET_RIGHT;
    },
    
    get SAFETY_MARGIN() {
        return GAME_CONSTANTS.PADDLE_HEIGHT * REPLAY_CONFIG.SAFETY_MARGIN_RATIO;
    }
} as const;
