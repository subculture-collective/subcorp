// office3d/constants.ts — shared constants for the 3D office scene
import type { AgentId } from '@/lib/types';

// ─── Catppuccin Mocha Colors ───
export const COLORS = {
    background: '#11111b',
    base: '#1e1e2e',
    mantle: '#181825',
    crust: '#11111b',
    surface0: '#313244',
    surface1: '#45475a',
    surface2: '#585b70',
    overlay0: '#6c7086',
    text: '#cdd6f4',
    subtext: '#a6adc8',
    yellow: '#f9e2af',
    green: '#a6e3a1',
    red: '#f38ba8',
    blue: '#89b4fa',
    lavender: '#b4befe',
    sapphire: '#74c7ec',
    accent: '#cba6f7',
    pink: '#f5c2e7',
    peach: '#fab387',
    sky: '#89dceb',
} as const;

// ─── Agent Colors (matching AGENTS config) ───
export const AGENT_COLORS: Record<AgentId, string> = {
    chora: '#b4befe',
    subrosa: '#f38ba8',
    thaum: '#cba6f7',
    praxis: '#a6e3a1',
    mux: '#74c7ec',
    primus: '#f5c2e7',
};

export const AGENT_SKIN_TONES: Record<AgentId, string> = {
    chora: '#f0d0b0',
    subrosa: '#e8c8a0',
    thaum: '#d4a880',
    praxis: '#e8d0a0',
    mux: '#d8c0a8',
    primus: '#c8b090',
};

// ─── Office Dimensions ───
export const OFFICE = {
    width: 40,
    depth: 24,
    wallHeight: 4,
    floorY: 0,
} as const;

// ─── Desk Positions (pod layout — 3 clusters of 2) ───
export interface DeskConfig {
    agentId: AgentId;
    position: [number, number, number]; // [x, y, z]
    rotation?: number; // y-axis rotation in radians
}

export const DESK_CONFIGS: DeskConfig[] = [
    // Pod A (left) — chora + subrosa
    { agentId: 'chora',   position: [-13, 0, 1],  rotation: 0 },
    { agentId: 'subrosa', position: [-10, 0, 1],  rotation: 0 },
    // Pod B (center) — thaum + primus
    { agentId: 'thaum',   position: [-1.5, 0, 1], rotation: 0 },
    { agentId: 'primus',  position: [1.5,  0, 1], rotation: 0 },
    // Pod C (right) — mux + praxis
    { agentId: 'mux',     position: [10, 0, 1],   rotation: 0 },
    { agentId: 'praxis',  position: [13, 0, 1],   rotation: 0 },
];

// ─── Prop Positions ───
export const PROPS = {
    // Break zone (front-left)
    coffeeMachine:  [-15, 0, 8] as [number, number, number],
    couch:          [-12, 0, 9] as [number, number, number],
    // Server corner (back-right)
    serverRack:     [17, 0, -10] as [number, number, number],
    serverRack2:    [18.5, 0, -10] as [number, number, number],
    // Plants scattered
    plant1:         [-17, 0, 6] as [number, number, number],
    plant2:         [5, 0, 8] as [number, number, number],
    plant3:         [16, 0, 4] as [number, number, number],
    plant4:         [-8, 0, -9] as [number, number, number],
    // Meeting area (center-back)
    meetingTable:   [0, 0, -7] as [number, number, number],
    // Wall decorations
    whiteboard:     [5, 2.2, -11.8] as [number, number, number],
    poster:         [-8, 2.5, -11.8] as [number, number, number],
    clock:          [-2, 3, -11.8] as [number, number, number],
    window:         [-14, 2, -11.8] as [number, number, number],
    window2:        [14, 2, -11.8] as [number, number, number],
    // Bookshelf (back wall)
    bookshelf:      [10, 0, -11] as [number, number, number],
    // Partition walls between pods
    partition1:     [-6.5, 0, 1.5] as [number, number, number],
    partition2:     [6.5, 0, 1.5] as [number, number, number],
} as const;

// ─── Camera Settings ───
export const CAMERA = {
    position: [30, 25, 30] as [number, number, number],
    zoom: 22,
    near: 0.1,
    far: 200,
} as const;

// ─── Agent Behavior Types ───
export type AgentBehavior = 'idle' | 'working' | 'walking' | 'chatting' | 'coffee' | 'celebrating' | 'thinking';

export const BEHAVIOR_EMOJIS: Record<AgentBehavior, string> = {
    idle: '💤',
    working: '💻',
    chatting: '💬',
    coffee: '☕',
    celebrating: '🎉',
    walking: '🚶',
    thinking: '💭',
};

// ─── Animation & Behavior Constants ───
export const AGENT_MOVE_SPEED = 2.4; // units per second
export const AGENT_EASE_DISTANCE = 1.0; // start easing within this distance of target
export const SPEECH_BUBBLE_DURATION_MS = 2000;
export const BEHAVIOR_UPDATE_INTERVAL_MIN = 8000;
export const BEHAVIOR_UPDATE_INTERVAL_MAX = 13000;
export const AGENT_MEMORY_BAR_MULTIPLIER = 10;
export const AGENT_MEMORY_BAR_MAX_WIDTH = 100;
export const SERVER_RACK_ACTIVE_LEDS = 3;

// ─── Droid Constants ───
export const DROID_PATROL_WAYPOINTS: [number, number, number][] = [
    [17, 0.01, -10],    // server rack
    [0, 0.01, -7],      // meeting table
    [-15, 0.01, 8],     // coffee machine
    [5, 0.01, 8],       // near plant2 (open area)
];

export const DROID_MOVE_SPEED = 1.6; // slower than agents (2.4)
export const DROID_COLOR = '#74c7ec'; // sapphire

// ─── Sky Colors by Time of Day ───
export const SKY_COLORS = {
    day:   { top: '#1e3a5f', bottom: '#0f172a' },
    dusk:  { top: '#6b2fa0', bottom: '#1a0a2e' },
    night: { top: '#0a0a1a', bottom: '#050510' },
} as const;
