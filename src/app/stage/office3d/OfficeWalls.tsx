// office3d/OfficeWalls.tsx — back wall, side walls, windows, decorations (no front wall — open plan)
'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { OFFICE, COLORS, PROPS, SKY_COLORS } from './constants';
import { useOfficeMaterials, type OfficeMaterials } from './materials';

// Shared window geometries (2 windows)
const WIN_FRAME = new THREE.BoxGeometry(5, 2.8, 0.1);
const WIN_GLASS = new THREE.PlaneGeometry(4.6, 2.4);
const WIN_VBAR = new THREE.BoxGeometry(0.05, 2.4, 0.02);
const WIN_HBAR = new THREE.BoxGeometry(4.6, 0.05, 0.02);

function WindowPane({ position, period, mat }: {
    position: [number, number, number];
    period: 'day' | 'dusk' | 'night';
    mat: OfficeMaterials;
}) {
    const sky = SKY_COLORS[period];

    return (
        <group position={position}>
            {/* Window frame */}
            <mesh material={mat.surface1} geometry={WIN_FRAME} />
            {/* Glass pane — unique per period */}
            <mesh position={[0, 0, 0.06]} geometry={WIN_GLASS}>
                <meshStandardMaterial
                    color={sky.top}
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                />
            </mesh>
            {/* Window cross bars */}
            <mesh position={[0, 0, 0.08]} material={mat.surface1} geometry={WIN_VBAR} />
            <mesh position={[0, 0, 0.08]} material={mat.surface1} geometry={WIN_HBAR} />
        </group>
    );
}

function Poster() {
    // Content occupies 128x180 within 128x256 power-of-2 canvas.
    // UV repeat.y = 180/256 = 0.703125 to only show the content portion.
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 256;
        const ctx = canvas.getContext('2d')!;

        // Draw content in top 180px (bottom 76px stays transparent)
        ctx.fillStyle = '#1a1a30';
        ctx.fillRect(0, 0, 128, 180);

        ctx.strokeStyle = COLORS.surface1;
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 126, 178);

        ctx.fillStyle = COLORS.accent;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SUBCORP', 64, 50);

        ctx.fillStyle = COLORS.overlay0;
        ctx.font = '10px monospace';
        ctx.fillText('AUTONOMY', 64, 80);
        ctx.fillText('THROUGH', 64, 100);
        ctx.fillText('ALIGNMENT', 64, 120);

        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, 140);
        ctx.lineTo(98, 140);
        ctx.stroke();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        // Only show the top 180/256 of the texture (content region)
        tex.repeat.set(1, 180 / 256);
        tex.offset.set(0, 1 - 180 / 256);
        return tex;
    }, []);

    useEffect(() => {
        return () => { texture.dispose(); };
    }, [texture]);

    return (
        <mesh position={PROPS.poster}>
            <planeGeometry args={[1.2, 1.7]} />
            <meshStandardMaterial map={texture} />
        </mesh>
    );
}

function WallClock() {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d')!;

        ctx.fillStyle = '#0a0a15';
        ctx.beginPath();
        ctx.arc(64, 64, 60, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = COLORS.surface1;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.strokeStyle = COLORS.overlay0;
        ctx.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(64 + Math.cos(angle) * 48, 64 + Math.sin(angle) * 48);
            ctx.lineTo(64 + Math.cos(angle) * 54, 64 + Math.sin(angle) * 54);
            ctx.stroke();
        }

        const now = new Date();
        const hourAngle = ((now.getHours() % 12) / 12) * Math.PI * 2 - Math.PI / 2;
        const minAngle = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;

        ctx.strokeStyle = COLORS.subtext;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(64, 64);
        ctx.lineTo(64 + Math.cos(hourAngle) * 30, 64 + Math.sin(hourAngle) * 30);
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(64, 64);
        ctx.lineTo(64 + Math.cos(minAngle) * 42, 64 + Math.sin(minAngle) * 42);
        ctx.stroke();

        ctx.fillStyle = COLORS.red;
        ctx.beginPath();
        ctx.arc(64, 64, 3, 0, Math.PI * 2);
        ctx.fill();

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }, []);

    useEffect(() => {
        return () => { texture.dispose(); };
    }, [texture]);

    return (
        <mesh position={PROPS.clock}>
            <circleGeometry args={[0.5, 32]} />
            <meshStandardMaterial map={texture} />
        </mesh>
    );
}

export function OfficeWalls({ period }: { period: 'day' | 'dusk' | 'night' }) {
    const mat = useOfficeMaterials();
    const backZ = -OFFICE.depth / 2;
    const halfW = OFFICE.width / 2;

    return (
        <group>
            {/* Back wall */}
            <mesh position={[0, OFFICE.wallHeight / 2, backZ]} material={mat.mantle}>
                <boxGeometry args={[OFFICE.width, OFFICE.wallHeight, 0.15]} />
            </mesh>

            {/* Left wall */}
            <mesh position={[-halfW, OFFICE.wallHeight / 2, 0]} material={mat.mantle}>
                <boxGeometry args={[0.15, OFFICE.wallHeight, OFFICE.depth]} />
            </mesh>

            {/* Right wall */}
            <mesh position={[halfW, OFFICE.wallHeight / 2, 0]} material={mat.mantle}>
                <boxGeometry args={[0.15, OFFICE.wallHeight, OFFICE.depth]} />
            </mesh>

            {/* No front wall — open plan diorama feel */}

            {/* Baseboards */}
            <mesh position={[0, 0.08, backZ + 0.1]} material={mat.surface0}>
                <boxGeometry args={[OFFICE.width, 0.15, 0.05]} />
            </mesh>
            <mesh position={[-halfW + 0.1, 0.08, 0]} material={mat.surface0}>
                <boxGeometry args={[0.05, 0.15, OFFICE.depth]} />
            </mesh>
            <mesh position={[halfW - 0.1, 0.08, 0]} material={mat.surface0}>
                <boxGeometry args={[0.05, 0.15, OFFICE.depth]} />
            </mesh>

            {/* Windows (two on back wall) */}
            <WindowPane position={PROPS.window} period={period} mat={mat} />
            <WindowPane position={PROPS.window2} period={period} mat={mat} />

            {/* Poster */}
            <Poster />

            {/* Clock */}
            <WallClock />
        </group>
    );
}
