import { Vec2 } from './Vec2.ts';
import { GameEvent, ComparisonResult, PaddleSide, EventType, HitEvent, ServeEvent, ScoreEvent } from './types.ts';
import { GAME_CONSTANTS } from './constants.ts';

export class EventLogger {
    events: GameEvent[];
    logElementId: string;

    constructor(logElementId: string = 'originalLogContent') {
        this.events = [];
        this.logElementId = logElementId;
    }

    reset(): void {
        this.events = [];
        const logDiv = document.getElementById(this.logElementId);
        if (logDiv) logDiv.innerHTML = '';
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
            pos: `(${Math.round(position.x)}, ${Math.round(position.y)})`,
            vel: `(${Math.round(event.velocity.x)}, ${Math.round(event.velocity.y)})`,
            player: event.player
        });
    }

    displayEvent(event: GameEvent): void {
        const logDiv = document.getElementById(this.logElementId);
        if (!logDiv) return;

        let paddleText = '';
        let posText = '';

        switch (event.type) {
            case EventType.HIT:
            case EventType.SERVE:
                paddleText = ` Pad(L:${Math.round(event.paddlePositions.left)}, R:${Math.round(event.paddlePositions.right)})`;
                if (event.type === EventType.HIT) {
                    posText = `Pos(${Math.round(event.position.x)}, ${Math.round(event.position.y)}) `;
                }
                break;
            case EventType.SCORE:
                posText = `Pos(${Math.round(event.position.x)}, ${Math.round(event.position.y)}) `;
                break;
        }
            
        let direction = event.player?.toUpperCase() || 'UNKNOWN';
        
        // For score events, show who got scored on (opposite of who scored)
        if (event.type === EventType.SCORE) {
            direction = event.player === 'left' ? 'RIGHT' : 'LEFT';
        }
        // For serve events, show direction of serve (opposite of who serves)
        else if (event.type === EventType.SERVE) {
            direction = event.player === 'left' ? 'RIGHT' : 'LEFT';
        }
        // For hit events, direction is correct (who hit)
        
        const headerLine = `[${event.tick}, ${event.type.toUpperCase()}, ${direction}]`;
        const dataLine = posText +
                         `Vel(${Math.round(event.velocity.x)}, ${Math.round(event.velocity.y)})` +
                         paddleText;

        const eventElement = document.createElement('div');
        eventElement.style.marginBottom = '4px';
        eventElement.innerHTML = `${headerLine}<br>${dataLine}`;
        logDiv.appendChild(eventElement);
        logDiv.scrollTop = logDiv.scrollHeight;
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

    compareWith(otherLogger: EventLogger): ComparisonResult {
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
}
