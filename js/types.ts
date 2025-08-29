import { Vec2 } from './classes/Vec2.ts';

export enum EventType {
    HIT = 'hit',
    SERVE = 'serve',
    SCORE = 'score'
}

interface BaseEvent {
    tick: number;
    velocity: Vec2;
    player: PaddleSide;
}

export interface HitEvent extends BaseEvent {
    type: EventType.HIT;
    position: Vec2;
    paddlePositions: {
        left: number;
        right: number;
    };
}

export interface ServeEvent extends BaseEvent {
    type: EventType.SERVE;
    paddlePositions: {
        left: number;
        right: number;
    };
}

export interface ScoreEvent extends BaseEvent {
    type: EventType.SCORE;
    position: Vec2;
}

export type GameEvent = HitEvent | ServeEvent | ScoreEvent;

export interface ComparisonResult {
    original: number;
    replay: number;
    matching: number;
    identical: boolean;
}

export interface FinalScores {
    left: number;
    right: number;
    winner: PaddleSide;
}

export type GameMode = 'play' | 'replay';
export type PaddleSide = 'left' | 'right';
export type KeyMap = { [key: string]: boolean };

export interface Ball {
    position: Vec2;
    velocity: Vec2;
    radius: number;
    update(deltaTime: number): void;
}

export interface Paddle {
    y: number;
    width: number;
    height: number;
    side: PaddleSide;
    velocity: number;
}
