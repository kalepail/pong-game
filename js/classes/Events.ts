import { Vec2 } from './Vec2.ts';
import { GameEvent, ComparisonResult, PaddleSide, EventType, HitEvent, ServeEvent, ScoreEvent } from '../types.ts';
import { GAME_CONSTANTS } from '../constants.ts';
import { FormatUtils } from '../utils/FormatUtils.ts';
import { DOMUtils } from '../utils/DOMUtils.ts';

export class Events {
    events: GameEvent[];
    logElementId: string;

    constructor(logElementId: string = 'originalLogContent') {
        this.events = [];
        this.logElementId = logElementId;
    }

    reset(): void {
        this.events = [];
        try {
            const logDiv = DOMUtils.getElement(this.logElementId);
            logDiv.innerHTML = '';
        } catch (error) {
            // Element may not exist in some contexts
        }
    }

    logHitEvent(position: Vec2, velocity: Vec2, player: PaddleSide, leftPaddleY: number, rightPaddleY: number, tick: number = 0): HitEvent {
        const event: HitEvent = {
            type: EventType.HIT,
            tick: tick,
            position: { ...position },
            velocity: { ...velocity },
            player: player,
            paddlePositions: {
                left: leftPaddleY,
                right: rightPaddleY
            }
        };

        this.events.push(event);
        this.displayEvent(event);
        this.logToConsole(event, position);
        return event;
    }

    logServeEvent(velocity: Vec2, player: PaddleSide, leftPaddleY: number, rightPaddleY: number, tick: number = 0): ServeEvent {
        const event: ServeEvent = {
            type: EventType.SERVE,
            tick: tick,
            velocity: { ...velocity },
            player: player,
            paddlePositions: {
                left: leftPaddleY,
                right: rightPaddleY
            }
        };

        this.events.push(event);
        this.displayEvent(event);
        this.logToConsole(event, { x: 0, y: 0 }); // Center position implied
        return event;
    }

    logScoreEvent(position: Vec2, velocity: Vec2, player: PaddleSide, tick: number = 0): ScoreEvent {
        const event: ScoreEvent = {
            type: EventType.SCORE,
            tick: tick,
            position: { ...position },
            velocity: { ...velocity },
            player: player
        };

        this.events.push(event);
        this.displayEvent(event);
        this.logToConsole(event, position);
        return event;
    }

    private logToConsole(event: GameEvent, position: Vec2): void {
        console.log(`[${this.logElementId}] Event logged:`, {
            type: event.type,
            tick: event.tick,
            pos: FormatUtils.formatPosition(position),
            vel: FormatUtils.formatVelocity(event.velocity),
            player: event.player
        });
    }

    displayEvent(event: GameEvent, skipScroll: boolean = false, skipAnimation: boolean = false): void {
        const logDiv = DOMUtils.getElement(this.logElementId);

        let paddleText = '';
        let posText = '';

        switch (event.type) {
            case EventType.HIT:
            case EventType.SERVE:
                paddleText = ` Pad(L:${FormatUtils.roundCoordinate(event.paddlePositions.left)}, R:${FormatUtils.roundCoordinate(event.paddlePositions.right)})`;
                if (event.type === EventType.HIT) {
                    posText = `Pos${FormatUtils.formatPosition(event.position)} `;
                }
                break;
            case EventType.SCORE:
                posText = `Pos${FormatUtils.formatPosition(event.position)} `;
                break;
        }
            
        let direction = event.player.toUpperCase() || 'UNKNOWN';
        
        // For score events, show who got scored on (opposite of who scored)
        if (event.type === EventType.SCORE) {
            direction = event.player === 'left' ? 'RIGHT' : 'LEFT';
        }
        // For serve events, show direction of serve (opposite of who serves)
        else if (event.type === EventType.SERVE) {
            direction = event.player === 'left' ? 'RIGHT' : 'LEFT';
        }
        // For hit events, direction is correct (who hit)
        
        const headerLine = `[${FormatUtils.formatTick(event.tick)}, ${event.type.toUpperCase()}, ${direction}]`;
        const dataLine = posText +
                         `Vel${FormatUtils.formatVelocity(event.velocity)}` +
                         paddleText;

        const eventElement = document.createElement('div');
        eventElement.className = 'log-entry';
        eventElement.innerHTML = `${headerLine}<br>${dataLine}`;
        
        // Add highlight animation for new entries (skip during import)
        if (!skipAnimation && (this.logElementId === 'originalLogContent' || this.logElementId === 'replayLogContent')) {
            eventElement.classList.add('new-entry');
        }
        
        logDiv.appendChild(eventElement);
        
        // Scroll the new event into view at the bottom (skip during import)
        if (!skipScroll) {
            eventElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
        }
    }

    exportLog(): string {
        return JSON.stringify(this.events, null, 2);
    }

    importLog(jsonString: string): boolean {
        try {
            this.events = JSON.parse(jsonString);
            return true;
        } catch (e) {
            console.error('Failed to import log:', e);
            return false;
        }
    }

    compareWith(otherLogger: Events): ComparisonResult {
        const thisEvents = this.events.length;
        const otherEvents = otherLogger.events.length;

        let matchingEvents = 0;
        for (let i = 0; i < Math.min(thisEvents, otherEvents); i++) {
            const e1 = this.events[i];
            const e2 = otherLogger.events[i];

            let positionsMatch = true;

            if (e1.type === e2.type) {
                switch (e1.type) {
                    case EventType.HIT:
                    case EventType.SCORE:
                        const pos1 = e1.position;
                        const pos2 = (e2 as HitEvent | ScoreEvent).position;
                        positionsMatch = Math.abs(pos1.x - pos2.x) < GAME_CONSTANTS.POSITION_TOLERANCE && Math.abs(pos1.y - pos2.y) < GAME_CONSTANTS.POSITION_TOLERANCE;
                        break;
                    case EventType.SERVE:
                        // Serve events don't need position comparison
                        break;
                }

                if (positionsMatch) {
                    matchingEvents++;
                }
            }
        }

        return {
            original: thisEvents,
            replay: otherEvents,
            matching: matchingEvents,
            identical: matchingEvents === thisEvents && thisEvents === otherEvents
        };
    }

    getEvents(): GameEvent[] {
        return [...this.events];
    }

    highlightReplayEvent(eventIndex: number): void {
        const logDiv = DOMUtils.getElement(this.logElementId);

        // Remove previous highlight
        const previousHighlight = logDiv.querySelector('.replay-current');
        if (previousHighlight) {
            previousHighlight.classList.remove('replay-current');
        }

        // Add highlight to current event
        const entries = logDiv.querySelectorAll('.log-entry');
        if (entries[eventIndex]) {
            entries[eventIndex].classList.add('replay-current');
            // Scroll to the highlighted event to track replay progress
            entries[eventIndex].scrollIntoView({ behavior: 'smooth', block: 'end' });
        }

        // Also scroll the replay log to the same position
        const replayLogDiv = DOMUtils.getElement('replayLogContent');
        if (replayLogDiv) {
            const replayEntries = replayLogDiv.querySelectorAll('.log-entry');
            if (replayEntries[eventIndex]) {
                replayEntries[eventIndex].scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }
    }

    highlightReplayEvents(eventIndices: number[]): void {
        const logDiv = DOMUtils.getElement(this.logElementId);

        // Remove previous highlights
        const previousHighlights = logDiv.querySelectorAll('.replay-current');
        previousHighlights.forEach(highlight => {
            highlight.classList.remove('replay-current');
        });

        // Add highlight to all current events
        const entries = logDiv.querySelectorAll('.log-entry');
        eventIndices.forEach(eventIndex => {
            if (entries[eventIndex]) {
                entries[eventIndex].classList.add('replay-current');
            }
        });

        // Scroll to the last highlighted event (highest index)
        if (eventIndices.length > 0) {
            const lastIndex = eventIndices[eventIndices.length - 1];
            if (entries[lastIndex]) {
                entries[lastIndex].scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }

        // Also scroll the replay log to the same position
        const replayLogDiv = DOMUtils.getElement('replayLogContent');
        if (replayLogDiv && eventIndices.length > 0) {
            const lastIndex = eventIndices[eventIndices.length - 1];
            const replayEntries = replayLogDiv.querySelectorAll('.log-entry');
            if (replayEntries[lastIndex]) {
                replayEntries[lastIndex].scrollIntoView({ behavior: 'smooth', block: 'end' });
            }
        }
    }

    clearReplayHighlight(): void {
        const logDiv = DOMUtils.getElement(this.logElementId);

        const highlighted = logDiv.querySelector('.replay-current');
        if (highlighted) {
            highlighted.classList.remove('replay-current');
        }
    }
}
