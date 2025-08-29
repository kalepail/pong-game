import { EventLogger } from './EventLogger.js';

export class ReplaySystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.events = [];
        this.currentEventIndex = 0;
        this.replayStartTime = null;
        this.isActive = false;
        this.ballPosition = null;
        this.ballVelocity = null;
        this.replayLogger = new EventLogger('replayLogContent');
        this.paddleTargets = { left: null, right: null };
        this.pendingMoves = { left: null, right: null };
    }

    calculateBallY(targetX, ball) {
        const dx = targetX - ball.position.x;
        const vx = ball.velocity.x;
        
        if (Math.abs(vx) < 0.001 || (dx * vx) < 0) return null;
        
        const time = dx / vx;
        let y = ball.position.y + ball.velocity.y * time;
        
        const height = this.canvas.height;
        const ballRadius = ball.radius;
        
        // Calculate bounces
        let bounces = 0;
        while (y < ballRadius || y > height - ballRadius) {
            if (y < ballRadius) {
                y = 2 * ballRadius - y;
                bounces++;
            } else if (y > height - ballRadius) {
                y = 2 * (height - ballRadius) - y;
                bounces++;
            }
        }
        
        return y;
    }



    paddleWouldIntercept(ball, side, currentPaddleY) {
        const paddleHeight = 80;
        const paddleWidth = 10;
        const paddleOffset = side === 'left' ? 30 : this.canvas.width - 40;
        
        // Match updated paddle logic - use paddle face (vertical line) not full width
        const paddleFaceX = side === 'left' ? paddleOffset + paddleWidth : paddleOffset;
        const paddleTop = currentPaddleY;
        const paddleBottom = currentPaddleY + paddleHeight;
        
        // Calculate ball Y position when it crosses the paddle face
        const ballY = this.calculateBallY(paddleFaceX, ball);
        if (ballY === null) return false;
        
        // Check if ball (with radius) would intersect paddle face vertically
        const ballTop = ballY - ball.radius;
        const ballBottom = ballY + ball.radius;
        
        return ballBottom >= paddleTop && ballTop <= paddleBottom;
    }

    calculateMissPosition(ball, missingSide, currentPaddleY = null) {
        const paddleHeight = 80;
        const paddleWidth = 10;
        const paddleOffset = missingSide === 'left' ? 30 : this.canvas.width - 40;
        
        // Use paddle face position (matches updated paddle logic)
        const paddleFaceX = missingSide === 'left' ? paddleOffset + paddleWidth : paddleOffset;
        
        // Calculate where ball will cross the paddle face
        const ballHitY = this.calculateBallY(paddleFaceX, ball);
        if (ballHitY === null) return { targetY: this.canvas.height / 2 - paddleHeight / 2 };
        
        // Account for ball radius
        const ballTop = ballHitY - ball.radius;
        const ballBottom = ballHitY + ball.radius;
        
        // Calculate paddle positions that would catch the ball
        const minCatchY = ballTop - paddleHeight;
        const maxCatchY = ballBottom;
        
        // Add safety margin (20% of paddle height)
        const safetyMargin = paddleHeight * 0.2;
        
        // Calculate avoidance positions
        const avoidAbove = minCatchY - safetyMargin;
        const avoidBelow = maxCatchY + safetyMargin;
        
        // Use provided paddle position or default to center
        if (currentPaddleY === null) {
            currentPaddleY = this.canvas.height / 2 - paddleHeight / 2;
        }
        
        let targetY;
        
        // Check if we can avoid above
        if (avoidAbove >= 0) {
            // Check if we can avoid below
            if (avoidBelow + paddleHeight <= this.canvas.height) {
                // Both positions are valid, choose the one requiring less movement
                const distanceAbove = Math.abs(currentPaddleY - avoidAbove);
                const distanceBelow = Math.abs(currentPaddleY - avoidBelow);
                targetY = distanceAbove <= distanceBelow ? avoidAbove : avoidBelow;
            } else {
                // Only above is valid
                targetY = avoidAbove;
            }
        } else if (avoidBelow + paddleHeight <= this.canvas.height) {
            // Only below is valid
            targetY = avoidBelow;
        } else {
            // Neither position is valid, move to edge that's furthest from ball
            const distanceFromTop = Math.abs(ballHitY - 0);
            const distanceFromBottom = Math.abs(ballHitY - this.canvas.height);
            targetY = distanceFromTop > distanceFromBottom ? 0 : this.canvas.height - paddleHeight;
        }
        
        // Ensure final position is within bounds
        targetY = Math.max(0, Math.min(this.canvas.height - paddleHeight, targetY));
        
        return { targetY };
    }

    calculateOptimalPaddlePosition(hitEvent, ballTrajectory, paddleHeight) {
        // Use the logged ball position as the collision point
        const collisionY = hitEvent.position.y;
        
        // Extract target velocity to determine required hit position
        const targetVx = hitEvent.velocity.x;
        const targetVy = hitEvent.velocity.y;
        
        // Calculate the required bounce angle from target velocity
        const requiredAngle = Math.atan2(targetVy, Math.abs(targetVx));
        
        // Map back to normalized position on paddle face
        const maxBounceAngle = Math.PI / 3;
        const normalizedPosition = Math.max(-0.8, Math.min(0.8, requiredAngle / maxBounceAngle));
        const hitPosition = (normalizedPosition + 1) / 2; // Convert from [-1,1] to [0,1]
        
        // Calculate required paddle top position so ball hits at calculated hit position
        const paddleTop = collisionY - (hitPosition * paddleHeight);
        
        return {
            paddleTop: paddleTop,
            hitPosition: hitPosition,
            collisionPoint: { x: hitEvent.position.x, y: collisionY }
        };
    }

    analyzeUpcomingEvents(ball, leftPaddle, rightPaddle) {
        // Look ahead for the next event
        for (let i = this.currentEventIndex; i < this.events.length; i++) {
            const event = this.events[i];
            
            if (event.type === 'hit') {
                const side = event.player;
                
                // Only calculate if we don't already have a pending move for this side
                if (!this.pendingMoves[side]) {
                    const paddleHeight = 80;
                    const optimalPosition = this.calculateOptimalPaddlePosition(event, ball, paddleHeight);
                    
                    this.pendingMoves[side] = {
                        targetY: optimalPosition.paddleTop,
                        eventIndex: i,
                        type: 'hit',
                        executed: false
                    };
                }
                break; // Only calculate for the very next event

            } else if (event.type === 'score') {
                // Determine which paddle should miss by checking ball direction
                const ballMovingLeft = ball.velocity.x < 0;
                const missingSide = ballMovingLeft ? 'left' : 'right';
                
                // Only calculate if we don't already have a pending move for this side
                if (!this.pendingMoves[missingSide]) {
                    const currentPaddle = missingSide === 'left' ? leftPaddle : rightPaddle;
                    const needsToMove = this.paddleWouldIntercept(ball, missingSide, currentPaddle.y);
                    
                    if (needsToMove) {
                        const missPosition = this.calculateMissPosition(ball, missingSide, currentPaddle.y);
                        
                        this.pendingMoves[missingSide] = {
                            targetY: missPosition.targetY,
                            eventIndex: i,
                            type: 'miss',
                            executed: false
                        };
                    }
                }
                break; // Only calculate for the very next event
            }
        }
    }

    movePaddle(paddle, deltaTime) {
        const pendingMove = this.pendingMoves[paddle.side];
        if (!pendingMove) return;
        
        const targetY = pendingMove.targetY;
        const currentY = paddle.y;
        const paddleSpeed = 400; // Match paddle speed from Paddle.js
        
        // Calculate distance to target
        const distance = targetY - currentY;
        
        // If we're close enough, snap to target
        if (Math.abs(distance) < paddleSpeed * deltaTime) {
            paddle.y = Math.max(0, Math.min(this.canvas.height - paddle.height, targetY));
            pendingMove.executed = true;
            
            // Clear positioning moves when complete (but not hit/miss moves)
            if (pendingMove.type === 'position_for_next_hit' || pendingMove.type === 'position_for_serve_followup') {
                this.pendingMoves[paddle.side] = null;
            }
        } else {
            // Move toward target at maximum speed
            const direction = Math.sign(distance);
            const newY = currentY + direction * paddleSpeed * deltaTime;
            paddle.y = Math.max(0, Math.min(this.canvas.height - paddle.height, newY));
        }
    }

    startReplay(events) {
        this.events = [...events];
        this.currentEventIndex = 0;
        this.replayStartTime = Date.now();
        this.isActive = true;
        this.replayLogger.reset();
        this.pendingMoves = { left: null, right: null };

        if (this.events.length > 0) {
            const firstEvent = this.events[0];
            this.ballPosition = { ...firstEvent.position };
            this.ballVelocity = { ...firstEvent.velocity };
        }
    }

    update(deltaTime, ball, leftPaddle, rightPaddle) {
        if (!this.isActive || this.events.length === 0) return;

        const currentTime = Date.now() - this.replayStartTime;

        // Check for upcoming events and calculate paddle positions
        this.analyzeUpcomingEvents(ball, leftPaddle, rightPaddle);

        // Execute any pending paddle movements
        this.movePaddle(leftPaddle, deltaTime);
        this.movePaddle(rightPaddle, deltaTime);

        // Process events up to current time
        while (this.currentEventIndex < this.events.length &&
               this.events[this.currentEventIndex].timestamp <= currentTime) {

            const event = this.events[this.currentEventIndex];
            this.ballPosition = { ...event.position };
            this.ballVelocity = { ...event.velocity };

            // Process event and look ahead to position current paddle for next interaction
            if (event.type === 'hit') {
                this.pendingMoves[event.player] = null;
                
                // Look ahead to find when the OTHER player hits next to see where current paddle should be
                const currentPlayer = event.player;
                const otherPlayer = currentPlayer === 'left' ? 'right' : 'left';
                
                for (let i = this.currentEventIndex + 1; i < this.events.length; i++) {
                    const nextEvent = this.events[i];
                    if (nextEvent.type === 'hit' && nextEvent.player === otherPlayer && nextEvent.targetPaddlePosition) {
                        // When the other player hits next, they will record where current paddle was
                        // So animate current paddle to where other player will record it
                        const paddleHeight = 80;
                        const targetY = nextEvent.targetPaddlePosition.y - paddleHeight / 2;
                        const clampedTargetY = Math.max(0, Math.min(this.canvas.height - paddleHeight, targetY));
                        
                        this.pendingMoves[currentPlayer] = {
                            targetY: clampedTargetY,
                            eventIndex: i,
                            type: 'position_for_next_hit',
                            executed: false
                        };
                        break;
                    }
                }
            } else if (event.type === 'serve') {
                this.pendingMoves['left'] = null;
                this.pendingMoves['right'] = null;
                
                // Look ahead to find when the receiving player hits to see where serving paddle should be
                const servingPlayer = event.player;
                const receivingPlayer = servingPlayer === 'left' ? 'right' : 'left';
                
                for (let i = this.currentEventIndex + 1; i < this.events.length; i++) {
                    const nextEvent = this.events[i];
                    if (nextEvent.type === 'hit' && nextEvent.player === receivingPlayer && nextEvent.targetPaddlePosition) {
                        // When the receiving player hits, they will record where serving paddle was
                        // So animate serving paddle to where receiving player will record it
                        const paddleHeight = 80;
                        const targetY = nextEvent.targetPaddlePosition.y - paddleHeight / 2;
                        const clampedTargetY = Math.max(0, Math.min(this.canvas.height - paddleHeight, targetY));
                        
                        this.pendingMoves[servingPlayer] = {
                            targetY: clampedTargetY,
                            eventIndex: i,
                            type: 'position_for_serve_followup',
                            executed: false
                        };
                        break;
                    }
                }
            } else if (event.type === 'score') {
                // Clear the pending miss move for the paddle that should have missed
                const ballMovingLeft = this.ballVelocity.x < 0;
                const missingSide = ballMovingLeft ? 'left' : 'right';
                this.pendingMoves[missingSide] = null;
            }

            this.replayLogger.logEvent(
                event.type,
                event.position,
                event.velocity,
                event.player,
                event.targetPaddlePosition
            );

            this.currentEventIndex++;
        }

        // Update ball physics
        if (this.ballPosition && this.ballVelocity) {
            ball.position.x = this.ballPosition.x;
            ball.position.y = this.ballPosition.y;
            ball.velocity.x = this.ballVelocity.x;
            ball.velocity.y = this.ballVelocity.y;

            ball.update(deltaTime);

            this.ballPosition = { x: ball.position.x, y: ball.position.y };
            this.ballVelocity = { x: ball.velocity.x, y: ball.velocity.y };
        }

        // Check if replay is complete
        if (this.currentEventIndex >= this.events.length &&
            currentTime > this.events[this.events.length - 1].timestamp + 2000) {
            this.stopReplay();
        }
    }

    stopReplay() {
        this.isActive = false;
        this.currentEventIndex = 0;
    }
}