// office3d/AgentSprite.tsx — billboarded agent sprites with canvas-generated textures
'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { BEHAVIOR_EMOJIS, COLORS, AGENT_MOVE_SPEED, AGENT_EASE_DISTANCE } from './constants';
import type { Agent3DState } from './useOfficeState';

// Generate a pixel-art agent sprite texture on canvas (32x64 power-of-2)
// Sprite is drawn in the top 48px; bottom 16px are transparent padding
function generateAgentTexture(color: string, skinColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Clear entire canvas (bottom 16px stays transparent)
    ctx.clearRect(0, 0, 32, 64);

    // Shadow (ellipse at feet)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(16, 45, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(11, 34, 4, 10);
    ctx.fillRect(17, 34, 4, 10);
    ctx.globalAlpha = 1;

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(9, 18, 14, 16);

    // Arms
    ctx.fillStyle = skinColor;
    ctx.fillRect(5, 20, 4, 12);
    ctx.fillRect(23, 20, 4, 12);

    // Head
    ctx.fillStyle = skinColor;
    ctx.fillRect(10, 4, 12, 14);

    // Hair/hat accent
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(10, 2, 12, 5);
    ctx.globalAlpha = 1;

    // Eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(13, 10, 2, 2);
    ctx.fillRect(17, 10, 2, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
}

export function AgentSprite({
    agent,
    onClick,
    onPointerDown,
    onPointerEnter,
    onPointerLeave,
}: {
    agent: Agent3DState;
    onClick?: () => void;
    onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const smoothPos = useRef({ x: agent.position[0], z: agent.position[2] });
    const agentRef = useRef(agent);

    useEffect(() => {
        agentRef.current = agent;
    }, [agent]);

    const texture = useMemo(
        () => generateAgentTexture(agent.color, agent.skinColor),
        [agent.color, agent.skinColor],
    );

    // Dispose texture on unmount or when dependencies change
    useEffect(() => {
        return () => {
            texture.dispose();
        };
    }, [texture]);

    // Smooth position interpolation + bob animation (runs every render frame)
    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const a = agentRef.current;
        const sp = smoothPos.current;

        // Interpolate XZ toward target with ease-out
        const dx = a.targetPosition[0] - sp.x;
        const dz = a.targetPosition[2] - sp.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 0.01) {
            // Constant speed, decelerating within AGENT_EASE_DISTANCE of target
            const speed = dist > AGENT_EASE_DISTANCE
                ? AGENT_MOVE_SPEED
                : AGENT_MOVE_SPEED * (dist / AGENT_EASE_DISTANCE);
            const step = Math.min(speed * delta, dist);
            sp.x += (dx / dist) * step;
            sp.z += (dz / dist) * step;
        }

        // Bob animation
        const bob = a.behavior === 'walking'
            ? Math.sin(clock.elapsedTime * 4) * 0.06
            : a.behavior === 'celebrating'
            ? Math.abs(Math.sin(clock.elapsedTime * 6)) * 0.15
            : Math.sin(clock.elapsedTime * 1.5) * 0.02;

        groupRef.current.position.set(sp.x, 0.01 + bob, sp.z);
    });

    return (
        <group
            ref={groupRef}
            position={[agent.position[0], agent.position[1], agent.position[2]]}
        >
            <Billboard follow lockX={false} lockY={false} lockZ={false}>
                {/* Agent body sprite */}
                <mesh
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    onPointerDown={(e) => { e.stopPropagation(); onPointerDown?.(e); }}
                    onPointerEnter={onPointerEnter}
                    onPointerLeave={onPointerLeave}
                    position={[0, 0.7, 0]}
                    geometry={SPRITE_PLANE}
                >
                    <meshBasicMaterial
                        map={texture}
                        transparent
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        toneMapped={false}
                    />
                </mesh>

                {/* Behavior emoji indicator */}
                <Text
                    position={[0, 1.5, 0]}
                    fontSize={0.3}
                    anchorX='center'
                    anchorY='middle'
                >
                    {BEHAVIOR_EMOJIS[agent.behavior]}
                </Text>

                {/* Name label */}
                <Text
                    position={[0, -0.1, 0]}
                    fontSize={0.18}
                    color={agent.color}
                    anchorX='center'
                    anchorY='top'
                    fontWeight='bold'
                >
                    {agent.name}
                </Text>

                {/* Glow ring for chatting/celebrating */}
                {(agent.behavior === 'chatting' || agent.behavior === 'celebrating') && (
                    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={GLOW_RING}>
                        <meshStandardMaterial
                            color={agent.color}
                            transparent
                            opacity={0.2}
                            emissive={agent.color}
                            emissiveIntensity={0.3}
                            side={THREE.DoubleSide}
                        />
                    </mesh>
                )}

                {/* Speech bubble (check timestamp expiry for immediate hide) */}
                {agent.speechBubble && agent.speechExpiresAt > 0 && (
                    <SpeechBubble3D
                        text={agent.speechBubble}
                        color={agent.color}
                    />
                )}
            </Billboard>
        </group>
    );
}

// Shared geometry for speech bubble border — avoids allocating a new PlaneGeometry on every mount
const BUBBLE_PLANE = new THREE.PlaneGeometry(2.2, 0.5);
const BUBBLE_EDGES = new THREE.EdgesGeometry(BUBBLE_PLANE);
const SPRITE_PLANE = new THREE.PlaneGeometry(0.8, 1.6);
const GLOW_RING = new THREE.RingGeometry(0.4, 0.55, 16);

function SpeechBubble3D({ text, color }: { text: string; color: string }) {
    const truncated = text.length > 40 ? text.slice(0, 38) + '…' : text;

    return (
        <group position={[0, 1.9, 0]}>
            {/* Bubble background */}
            <mesh geometry={BUBBLE_PLANE}>
                <meshBasicMaterial
                    color={COLORS.mantle}
                    transparent
                    opacity={0.92}
                    toneMapped={false}
                />
            </mesh>
            {/* Border */}
            <lineSegments geometry={BUBBLE_EDGES}>
                <lineBasicMaterial color={color} transparent opacity={0.8} />
            </lineSegments>
            {/* Text */}
            <Text
                position={[0, 0, 0.01]}
                fontSize={0.1}
                color='#d4d4d8'
                anchorX='center'
                anchorY='middle'
                maxWidth={2}
            >
                {truncated}
            </Text>
        </group>
    );
}
