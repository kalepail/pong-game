# Pong Game

A TypeScript implementation of the classic Pong game with event recording and replay functionality.

## Features

- Classic Pong gameplay with two paddles and a ball
- Event recording system that captures all game events
- Replay functionality to watch recorded games
- TypeScript implementation with strict type checking
- Responsive game controls

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kalepail/pong-game.git
   cd pong-game
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:
```bash
npm run dev
```

The game will be available at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

### Type Checking

Run TypeScript type checking:
```bash
npm run check
```

## How to Play

- **Player 1 (Left Paddle)**: Use `W` and `S` keys to move up and down
- **Player 2 (Right Paddle)**: Use `Up Arrow` and `Down Arrow` keys to move up and down
- **Start Game**: Press `Space` to start or restart the game
- **Record/Replay**: The game automatically records events and allows replay functionality

## Project Structure

```
pong-game/
├── js/
│   ├── classes/          # Core game classes
│   │   ├── Ball.ts
│   │   ├── Game.ts
│   │   ├── Paddle.ts
│   │   ├── EventLogger.ts
│   │   └── ReplaySystem.ts
│   ├── utils/            # Utility functions
│   ├── constants.ts      # Game constants
│   ├── main.ts          # Entry point
│   └── types.ts         # TypeScript type definitions
├── dist/                # Production build output
├── index.html          # Main HTML file
├── styles.css          # Game styling
└── package.json        # Dependencies and scripts
```

## Architecture

The game is built using a class-based architecture:

- **Game**: Main game controller that manages game state and coordinates all components
- **Ball**: Handles ball physics, movement, and collision detection
- **Paddle**: Manages paddle movement and collision detection
- **EventLogger**: Records all game events for replay functionality
- **ReplaySystem**: Handles playback of recorded game sessions
- **Vec2**: Vector math utility for 2D calculations

## Technologies Used

- **TypeScript**: For type safety and better development experience
- **Vite**: Modern build tool for fast development and optimized production builds
- **HTML5 Canvas**: For game rendering
- **ES6 Modules**: For modular code organization

## Development Notes

- The game uses TypeScript with strict type checking enabled
- Vite handles TypeScript compilation and hot module replacement during development
- Event logging captures all game interactions for accurate replay
- Manual testing is performed via browser since no automated test framework is configured

## Troubleshooting

If you encounter port conflicts, use the included script:
```bash
./kill-ports.sh
```

This will kill any processes running on ports 3000-3010.
