import { Game } from './Game.js';

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);

    // Initial render to show the game state
    game.render();
    
    // Button event listeners
    document.getElementById('startBtn').addEventListener('click', () => {
        game.start();
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        game.pause();
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        game.reset();
    });
    
    document.getElementById('replayBtn').addEventListener('click', () => {
        game.startReplay();
    });
    
    document.getElementById('exportBtn').addEventListener('click', () => {
        game.exportLog();
    });
    
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create a synthetic event for the Game's handleFileImport method
            const syntheticEvent = { target: { files: [file] } };
            game.handleFileImport(syntheticEvent);
        }
    });
    
    // Enable/disable buttons based on game state
    const updateButtons = () => {
        const hasEvents = game.eventLogger.events.length > 0;
        document.getElementById('pauseBtn').disabled = !game.isRunning;
        document.getElementById('replayBtn').disabled = !hasEvents || game.isRunning;
        document.getElementById('exportBtn').disabled = !hasEvents;
    };
    
    // Update buttons periodically
    setInterval(updateButtons, 100);
});