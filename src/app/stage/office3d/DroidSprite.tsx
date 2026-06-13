// office3d/DroidSprite.tsx — billboarded droid sprite that patrols the office
'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import {
    DROID_PATROL_WAYPOINTS,
    DROID_MOVE_SPEED,
    DROID_COLOR,
    AGENT_EASE_DISTANCE,
} from './constants';

// ─── Shared geometry (allocated once) ───
const DROID_PLANE = new THREE.PlaneGeometry(0.6, 1.2);
const DROID_GLOW_RING = new THREE.RingGeometry(0.3, 0.4, 16);

// ─── Canvas pixel-art robot texture (32x64) ───
function generateDroidTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 32, 64);

    // Shadow ellipse at feet
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(16, 45, 7, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (boxy treads)
    ctx.fillStyle = '#585b70'; // surface2
    ctx.fillRect(10, 36, 5, 8);
    ctx.fillRect(17, 36, 5, 8);

    // Body (boxy metallic)
    ctx.fillStyle = DROID_COLOR;
    ctx.fillRect(8, 18, 16, 18);

    // Body panel lines
    ctx.fillStyle = '#45475a'; // surface1
    ctx.fillRect(8, 26, 16, 1);
    ctx.fillRect(15, 19, 1, 16);

    // Head (rectangular)
    ctx.fillStyle = DROID_COLOR;
    ctx.fillRect(10, 6, 12, 12);

    // Visor (single glowing line)
    ctx.fillStyle = '#a6e3a1'; // green
    ctx.fillRect(12, 10, 8, 3);

    // Visor glow
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#a6e3a1';
    ctx.fillRect(11, 9, 10, 5);
    ctx.globalAlpha = 1;

    // Antenna
    ctx.fillStyle = '#6c7086'; // overlay0
    ctx.fillRect(15, 1, 2, 6);
    // Antenna tip
    ctx.fillStyle = '#f38ba8'; // red
    ctx.fillRect(14, 0, 4, 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    return texture;
}

export function DroidSprite({
    droidId,
    task,
}: {
    droidId: string;
    task: string;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const smoothPos = useRef({ x: DROID_PATROL_WAYPOINTS[0][0], z: DROID_PATROL_WAYPOINTS[0][2] });
    const waypointIdx = useRef(0);

    const texture = useMemo(() => generateDroidTexture(), []);

    useEffect(() => {
        return () => { texture.dispose(); };
    }, [texture]);

    // Truncate droid_id to last 4 hex chars for label
    const label = useMemo(() => {
        const suffix = droidId.replace(/^droid-/, '').slice(-4);
        return `d-${suffix}`;
    }, [droidId]);

    // Patrol movement + mechanical bob
    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const sp = smoothPos.current;

        // Current waypoint target
        const wp = DROID_PATROL_WAYPOINTS[waypointIdx.current];
        const dx = wp[0] - sp.x;
        const dz = wp[2] - sp.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.5) {
            // Pick next waypoint
            waypointIdx.current = (waypointIdx.current + 1) % DROID_PATROL_WAYPOINTS.length;
        } else {
            // Move toward waypoint with ease-out
            const speed = dist > AGENT_EASE_DISTANCE
                ? DROID_MOVE_SPEED
                : DROID_MOVE_SPEED * (dist / AGENT_EASE_DISTANCE);
            const step = Math.min(speed * delta, dist);
            sp.x += (dx / dist) * step;
            sp.z += (dz / dist) * step;
        }

        // Mechanical bob — fast, stiff
        const bob = Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.03;

        groupRef.current.position.set(sp.x, 0.01 + bob, sp.z);
    });

    return (
        <group
            ref={groupRef}
            position={[DROID_PATROL_WAYPOINTS[0][0], 0.01, DROID_PATROL_WAYPOINTS[0][2]]}
        >
            <Billboard follow lockX={false} lockY={false} lockZ={false}>
                {/* Droid body sprite */}
                <mesh position={[0, 0.5, 0]} geometry={DROID_PLANE}>
                    <meshBasicMaterial
                        map={texture}
                        transparent
                        alphaTest={0.1}
                        side={THREE.DoubleSide}
                        toneMapped={false}
                    />
                </mesh>

                {/* Robot emoji indicator */}
                <Text
                    position={[0, 1.2, 0]}
                    fontSize={0.25}
                    anchorX='center'
                    anchorY='middle'
                >
                    {'🤖'}
                </Text>

                {/* Name label */}
                <Text
                    position={[0, -0.15, 0]}
                    fontSize={0.14}
                    color={DROID_COLOR}
                    anchorX='center'
                    anchorY='top'
                    fontWeight='bold'
                >
                    {label}
                </Text>

                {/* Task label (truncated) */}
                {task && (
                    <Text
                        position={[0, -0.32, 0]}
                        fontSize={0.09}
                        color='#6c7086'
                        anchorX='center'
                        anchorY='top'
                        maxWidth={1.8}
                    >
                        {task.length > 30 ? task.slice(0, 28) + '…' : task}
                    </Text>
                )}

                {/* Glow ring (always on — droid is always active) */}
                <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={DROID_GLOW_RING}>
                    <meshStandardMaterial
                        color={DROID_COLOR}
                        transparent
                        opacity={0.2}
                        emissive={DROID_COLOR}
                        emissiveIntensity={0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            </Billboard>
        </group>
    );
}
