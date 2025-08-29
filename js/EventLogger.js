export class EventLogger {
    constructor(logElementId = 'originalLogContent') {
        this.events = [];
        this.startTime = null;
        this.logElementId = logElementId;
    }

    reset() {
        this.events = [];
        this.startTime = Date.now();
        const logDiv = document.getElementById(this.logElementId);
        if (logDiv) logDiv.innerHTML = '';
    }

    logEvent(type, position, velocity, player = null, targetPaddlePosition = null) {
        if (!this.startTime) this.startTime = Date.now();

        const event = {
            type: type,
            timestamp: Date.now() - this.startTime,
            position: { ...position },
            velocity: { ...velocity },
            player: player,
            targetPaddlePosition: targetPaddlePosition ? { ...targetPaddlePosition } : null
        };

        this.events.push(event);
        this.displayEvent(event);

        // Debug: Log to console to track duplicate events
        console.log(`[${this.logElementId}] Event logged:`, {
            type,
            timestamp: event.timestamp,
            pos: `(${Math.round(position.x)}, ${Math.round(position.y)})`,
            vel: `(${Math.round(velocity.x)}, ${Math.round(velocity.y)})`,
            player
        });

        return event;
    }

    displayEvent(event) {
        const logDiv = document.getElementById(this.logElementId);
        if (!logDiv) return;

        const targetPaddleText = event.targetPaddlePosition ? 
            ` Target(${Math.round(event.targetPaddlePosition.x)}, ${Math.round(event.targetPaddlePosition.y)})` : '';

        const eventText = `[${(event.timestamp / 1000).toFixed(2)}s] ${event.type.toUpperCase()} - ` +
                         `Pos(${Math.round(event.position.x)}, ${Math.round(event.position.y)}) ` +
                         `Vel(${Math.round(event.velocity.x)}, ${Math.round(event.velocity.y)})` +
                         `${event.player ? ' by ' + event.player : ''}${targetPaddleText}\n`;

        logDiv.innerHTML += eventText;
        logDiv.scrollTop = logDiv.scrollHeight;
    }

    exportLog() {
        return JSON.stringify(this.events, null, 2);
    }

    importLog(jsonString) {
        try {
            this.events = JSON.parse(jsonString);
            this.startTime = Date.now();
            return true;
        } catch (e) {
            console.error('Failed to import log:', e);
            return false;
        }
    }

    compareWith(otherLogger) {
        const thisEvents = this.events.length;
        const otherEvents = otherLogger.events.length;

        let matchingEvents = 0;
        for (let i = 0; i < Math.min(thisEvents, otherEvents); i++) {
            const e1 = this.events[i];
            const e2 = otherLogger.events[i];

            if (e1.type === e2.type &&
                Math.abs(e1.position.x - e2.position.x) < 5 &&
                Math.abs(e1.position.y - e2.position.y) < 5) {
                matchingEvents++;
            }
        }

        return {
            original: thisEvents,
            replay: otherEvents,
            matching: matchingEvents,
            identical: matchingEvents === thisEvents && thisEvents === otherEvents
        };
    }

    getEvents() {
        return [...this.events];
    }
}