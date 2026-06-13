// office3d/OfficeFloor.tsx — ground plane with grid lines and area rugs
'use client';

import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { OFFICE, COLORS, PROPS } from './constants';

// Floor perimeter edges — hoisted to avoid per-render allocation
const FLOOR_EDGES = new THREE.EdgesGeometry(new THREE.PlaneGeometry(OFFICE.width, OFFICE.depth));

// Colored area rug under each desk pod
function AreaRug({ position, width, depth, color }: {
    position: [number, number, number];
    width: number;
    depth: number;
    color: string;
}) {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
            <planeGeometry args={[width, depth]} />
            <meshStandardMaterial
                color={color}
                transparent
                opacity={0.08}
                roughness={0.95}
            />
        </mesh>
    );
}

export function OfficeFloor() {
    const gl = useThree(s => s.gl);

    const gridTexture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;

        // Fill base color
        ctx.fillStyle = COLORS.base;
        ctx.fillRect(0, 0, 512, 512);

        // Grid lines
        ctx.strokeStyle = COLORS.surface0;
        ctx.lineWidth = 1;
        const gridSize = 512 / 16;
        for (let i = 0; i <= 16; i++) {
            const pos = i * gridSize;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, 512);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(512, pos);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 3);
        texture.anisotropy = gl.capabilities.getMaxAnisotropy();
        return texture;
    }, [gl]);

    useEffect(() => {
        return () => { gridTexture.dispose(); };
    }, [gridTexture]);

    return (
        <group>
            {/* Main floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[OFFICE.width, OFFICE.depth]} />
                <meshStandardMaterial
                    map={gridTexture}
                    roughness={0.9}
                    metalness={0.1}
                />
            </mesh>

            {/* Floor perimeter edge */}
            <lineSegments position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={FLOOR_EDGES}>
                <lineBasicMaterial color={COLORS.surface1} transparent opacity={0.3} />
            </lineSegments>

            {/* Area rugs under desk pods */}
            <AreaRug position={[-11.5, 0.02, 1.5]} width={7} depth={5} color={COLORS.lavender} />
            <AreaRug position={[0, 0.02, 1.5]} width={6} depth={5} color={COLORS.accent} />
            <AreaRug position={[11.5, 0.02, 1.5]} width={7} depth={5} color={COLORS.sapphire} />

            {/* Meeting area rug */}
            <AreaRug position={[PROPS.meetingTable[0], 0.02, PROPS.meetingTable[2]]} width={8} depth={6} color={COLORS.peach} />

            {/* Break zone rug */}
            <AreaRug position={[-14, 0.02, 8.5]} width={8} depth={5} color={COLORS.green} />
        </group>
    );
}
