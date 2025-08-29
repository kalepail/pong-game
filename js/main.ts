import { Game } from './Game.ts';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const game = new Game(canvas);

    game.render();
    
    document.getElementById('startBtn')!.addEventListener('click', () => {
        game.start();
    });
    
    document.getElementById('pauseBtn')!.addEventListener('click', () => {
        game.togglePause();
    });
    
    document.getElementById('resetBtn')!.addEventListener('click', () => {
        game.reset();
    });
    
    document.getElementById('replayBtn')!.addEventListener('click', () => {
        game.startReplay();
    });
    
    document.getElementById('exportBtn')!.addEventListener('click', () => {
        game.exportLog();
    });
    
    document.getElementById('importBtn')!.addEventListener('click', () => {
        (document.getElementById('fileInput') as HTMLInputElement).click();
    });

    document.getElementById('fileInput')!.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const syntheticEvent = { target: { files: [file] } };
            game.handleFileImport(syntheticEvent);
        }
    });
    
    const updateButtons = () => {
        const hasEvents = game.eventLogger.events.length > 0;
        (document.getElementById('pauseBtn') as HTMLButtonElement).disabled = !game.isRunning;
        (document.getElementById('replayBtn') as HTMLButtonElement).disabled = !hasEvents || game.isRunning;
        (document.getElementById('exportBtn') as HTMLButtonElement).disabled = !hasEvents;
    };
    
    setInterval(updateButtons, 100);
});
