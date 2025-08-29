# AGENTS.md

## Build/Development Commands
- `npm run dev` - Start development server (Vite) on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- No test framework configured - manual testing via browser

## Testing
- **DO NOT run dev server for testing changes** - Use static file serving or open index.html directly in browser
- Test replay accuracy by playing a game, then replaying to verify identical ball velocities
- Verify paddle positioning calculations produce exact collision results from logged events
- Check trigonometric calculations for optimal paddle placement during replay
- Use `./kill-ports.sh` to kill processes on ports 3000-3010 if needed

## Architecture
This is a JavaScript Pong game with event recording/replay functionality:
- **Entry point**: `index.html` loads `js/main.js` as ES module
- **Core classes**: Game.js (main controller), Ball.js, Paddle.js 
- **Event system**: EventLogger.js records game events, ReplaySystem.js handles playback
- **Utilities**: Vec2.js (vector math), utils.js (game constants and physics)
- **Build tool**: Vite for dev server and bundling

## Code Style
- ES6 modules with named exports (`export class Game`)
- Class-based architecture with constructor dependency injection
- Camelcase naming for variables/methods, PascalCase for classes
- Constants in UPPER_CASE in utils.js
- No TypeScript - vanilla JavaScript
- Import statements use relative paths with .js extension
- Properties initialized in constructor, methods bound when needed
- Event handling through DOM listeners and custom event logging
