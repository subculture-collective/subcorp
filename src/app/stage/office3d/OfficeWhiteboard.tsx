// office3d/OfficeWhiteboard.tsx — interactive whiteboard with live ops data texture
'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { PROPS } from './constants';
import type { SystemStats } from '../hooks';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';

export function OfficeWhiteboard({
    stats,
    onClick,
}: {
    stats: SystemStats | null;
    onClick?: () => void;
}) {
    // Content occupies 512x320 within 512x512 power-of-2 canvas.
    // UV repeat.y = 320/512 = 0.625 to only show the content portion.
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        // Draw content in top 320px (bottom 192px stays transparent)
        // Board background
        ctx.fillStyle = '#f5f5f0';
        ctx.fillRect(0, 0, 512, 320);

        // Border
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, 508, 316);

        // Title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('OPS DASHBOARD', 256, 35);

        // Divider
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(30, 48);
        ctx.lineTo(482, 48);
        ctx.stroke();

        if (stats) {
            ctx.textAlign = 'left';
            ctx.font = '18px monospace';

            // Metrics
            const metrics = [
                { label: 'Events', value: stats.totalEvents.toLocaleString(), color: '#333' },
                { label: 'Active Missions', value: String(stats.activeMissions), color: stats.activeMissions > 0 ? '#166534' : '#333' },
                { label: 'Conversations', value: String(stats.totalConversations), color: '#333' },
                { label: 'Total Memories', value: String(Object.values(stats.agentMemories).reduce((a, b) => a + b, 0)), color: '#333' },
            ];

            metrics.forEach((m, i) => {
                const y = 78 + i * 32;
                ctx.fillStyle = '#666';
                ctx.font = '16px monospace';
                ctx.fillText(m.label, 30, y);
                ctx.fillStyle = m.color;
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(m.value, 300, y);
                ctx.textAlign = 'left';
            });

            // Agent memory bars
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(320, 55);
            ctx.lineTo(320, 200);
            ctx.stroke();

            const entries = Object.entries(stats.agentMemories).slice(0, 6);
            entries.forEach(([agentId, count], i) => {
                const agent = AGENTS[agentId as AgentId];
                const y = 68 + i * 22;
                const barWidth = Math.min(count * 12, 160);

                // Parse hex color for canvas
                const hex = agent?.color ?? '#666';
                ctx.fillStyle = hex;
                ctx.globalAlpha = 0.6;
                ctx.fillRect(340, y - 8, barWidth, 14);
                ctx.globalAlpha = 1;

                if (count > 0) {
                    ctx.fillStyle = '#999';
                    ctx.font = '12px monospace';
                    ctx.fillText(String(count), 345 + barWidth + 4, y + 4);
                }
            });

            // Status indicator
            ctx.fillStyle = '#a6e3a1';
            ctx.beginPath();
            ctx.arc(470, 290, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#999';
            ctx.font = '14px monospace';
            ctx.textAlign = 'right';
            ctx.fillText('LIVE', 456, 295);
        } else {
            ctx.fillStyle = '#999';
            ctx.font = '16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('Loading data...', 256, 120);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        // Only show the top 320/512 of the texture (content region)
        tex.repeat.set(1, 320 / 512);
        tex.offset.set(0, 1 - 320 / 512);
        return tex;
    }, [stats]);

    // Dispose texture on unmount or when stats change
    useEffect(() => {
        return () => {
            texture.dispose();
        };
    }, [texture]);

    return (
        <group
            position={PROPS.whiteboard}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
            {/* Board frame */}
            <mesh position={[0, 0, -0.03]}>
                <boxGeometry args={[4.5, 2.8, 0.06]} />
                <meshStandardMaterial color='#888' roughness={0.8} />
            </mesh>
            {/* Board surface — z=0.02 to sit in front of frame and avoid z-fighting */}
            <mesh position={[0, 0, 0.02]}>
                <planeGeometry args={[4.2, 2.5]} />
                <meshStandardMaterial map={texture} />
            </mesh>
        </group>
    );
}
