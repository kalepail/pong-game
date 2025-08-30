import { Game } from './classes/Game.ts';
import { DOMUtils } from './utils/DOMUtils.ts';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = DOMUtils.getElement('gameCanvas') as HTMLCanvasElement;
    const game = new Game(canvas);

    game.render();
    
    DOMUtils.getElement('startBtn').addEventListener('click', () => {
        game.start();
    });
    
    DOMUtils.getElement('resetBtn').addEventListener('click', () => {
        game.reset();
    });
    
    DOMUtils.getElement('replayBtn').addEventListener('click', () => {
        game.startReplay();
    });
    
    DOMUtils.getElement('exportBtn').addEventListener('click', () => {
        game.exportLog();
    });
    
    DOMUtils.getElement('importBtn').addEventListener('click', () => {
        DOMUtils.getInputElement('fileInput').click();
    });

    DOMUtils.getInputElement('fileInput').addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        
        if (file) {
            const syntheticEvent = { target: { files: [file] } };
            game.handleFileImport(syntheticEvent);
        }
    });
    
    const updateButtons = () => {
        const hasEvents = game.eventLogger.events.length > 0;
        DOMUtils.setButtonDisabled('replayBtn', !hasEvents || game.isRunning);
        DOMUtils.setButtonDisabled('exportBtn', !hasEvents || game.isRunning);
        DOMUtils.setButtonDisabled('importBtn', game.isRunning);
    };
    
    setInterval(updateButtons, 100);
});
