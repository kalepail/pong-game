// Common gameplay constants shared across the game
export const GAME_CONSTANTS = {
    // Canvas dimensions
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 400,
    
    // Paddle dimensions and positioning
    PADDLE_HEIGHT: 80,
    PADDLE_WIDTH: 10, // Visual only - not used in collision calculations
    PADDLE_OFFSET: 30, // Distance from screen edge for both paddles
    PADDLE_SPEED: 400,
    
    // Ball physics
    BALL_RADIUS: 8,
    BALL_INITIAL_SPEED: 300,
    BALL_SPEED_INCREASE_FACTOR: 1.05,

    BALL_SERVE_ANGLE_VARIATION: 0.5, // ±25% of π/4 radians
    
    // Paddle physics
    PADDLE_VELOCITY_TRANSFER: 0.3, // How much paddle velocity affects ball
    NORMALIZED_POSITION_LIMIT: 0.8, // Maximum absolute paddle hit position for angle calculation
    
    // Physics constants
    MAX_BOUNCE_ANGLE: Math.PI / 3, // 60 degrees
    
    // Game rules
    MAX_SCORE: 5, // Points needed to win
    
    // Game timing
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
} as const;

// Derived constants (calculated from base constants)
export const DERIVED_CONSTANTS = {
    get PADDLE_FACE_X_LEFT() {
        // Left paddle face is at the RIGHT edge of the paddle (where ball hits)
        return GAME_CONSTANTS.PADDLE_OFFSET + GAME_CONSTANTS.PADDLE_WIDTH;
    },
    
    get PADDLE_FACE_X_RIGHT() {
        // Right paddle face is at the LEFT edge of the paddle (where ball hits)
        return GAME_CONSTANTS.CANVAS_WIDTH - GAME_CONSTANTS.PADDLE_OFFSET - GAME_CONSTANTS.PADDLE_WIDTH;
    },
    
    get SAFETY_MARGIN() {
        return GAME_CONSTANTS.PADDLE_HEIGHT * REPLAY_CONFIG.SAFETY_MARGIN_RATIO;
    },

    get TICK_DURATION() {
        return 1 / GAME_CONSTANTS.TICKS_PER_SECOND;
    }
} as const;
