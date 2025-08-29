import { Vec2 } from './Vec2.ts';

export interface GameEvent {
    type: 'hit' | 'serve' | 'score';
    timestamp: number;
    position: Vec2;
    velocity: Vec2;
    player: string | null;
    targetPaddlePosition: Vec2 | null;
}

export interface ComparisonResult {
    original: number;
    replay: number;
    matching: number;
    identical: boolean;
}

export interface FinalScores {
    left: number;
    right: number;
    winner: string;
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
    x: number;
    y: number;
    width: number;
    height: number;
    side: PaddleSide;
    velocity: number;
}
