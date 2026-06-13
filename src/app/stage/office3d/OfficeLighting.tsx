// office3d/OfficeLighting.tsx — ambient + ceiling lights for 40x24 office
'use client';

import * as THREE from 'three';
import { COLORS } from './constants';

// Shared fixture geometries
const FIXTURE_HOUSING = new THREE.BoxGeometry(1.2, 0.08, 0.4);
const FIXTURE_GLOW = new THREE.BoxGeometry(0.8, 0.04, 0.2);

// 16 ceiling lights in a 4x4 grid for even coverage across the 40x24 room.
// x: ±16, ±6 covers wall-to-wall; z: ±9, ±3 covers front-to-back with no dark corners.
const LIGHT_POSITIONS: [number, number][] = [
    [-16, -9], [-6, -9], [6, -9], [16, -9],
    [-16, -3], [-6, -3], [6, -3], [16, -3],
    [-16,  3], [-6,  3], [6,  3], [16,  3],
    [-16,  9], [-6,  9], [6,  9], [16,  9],
];

// Visual fixture meshes match light positions
const FIXTURE_POSITIONS = LIGHT_POSITIONS;

// PointLight intensity is in candela (physically correct lighting in R3F v8+).
// At decay=2, illuminance = intensity / distance². 16 lights for uniform wash.
const PERIOD_CONFIG = {
    day:   { ambient: 0.7,  spot: 35, hemi: 0.5,  dirFill: 0.5,  glowEmissive: 0.3, hemiSky: '#1e3a5f', hemiGround: '#1e1e2e' },
    dusk:  { ambient: 0.5,  spot: 25, hemi: 0.35, dirFill: 0.25, glowEmissive: 0.6, hemiSky: '#3d1f5e', hemiGround: '#1a0a2e' },
    night: { ambient: 0.25, spot: 15, hemi: 0.2,  dirFill: 0.05, glowEmissive: 0.9, hemiSky: '#0a0a1a', hemiGround: '#050510' },
} as const;

export function OfficeLighting({
    period,
}: {
    period: 'day' | 'dusk' | 'night';
}) {
    const cfg = PERIOD_CONFIG[period];

    return (
        <group>
            {/* Ambient base */}
            <ambientLight intensity={cfg.ambient} color='#b4befe' />

            {/* Hemisphere — sky/ground shift with time of day */}
            <hemisphereLight args={[cfg.hemiSky, cfg.hemiGround, cfg.hemi]} />

            {/* Visual fixture meshes on ceiling (all 8) */}
            {FIXTURE_POSITIONS.map(([x, z], i) => (
                <group key={`fixture-${i}`}>
                    {/* Light fixture housing */}
                    <mesh position={[x, 3.85, z]} geometry={FIXTURE_HOUSING}>
                        <meshStandardMaterial color={COLORS.surface1} />
                    </mesh>
                    {/* Light bulb glow — brighter at night */}
                    <mesh position={[x, 3.78, z]} geometry={FIXTURE_GLOW}>
                        <meshStandardMaterial
                            color={COLORS.yellow}
                            emissive={COLORS.yellow}
                            emissiveIntensity={cfg.glowEmissive}
                        />
                    </mesh>
                </group>
            ))}

            {/* 16 point lights — 4x4 grid for uniform coverage */}
            {LIGHT_POSITIONS.map(([x, z], i) => (
                <pointLight
                    key={`light-${i}`}
                    position={[x, 3.5, z]}
                    intensity={cfg.spot}
                    distance={24}
                    decay={2}
                    color={COLORS.yellow}
                />
            ))}

            {/* Directional fill — simulates indirect window light, dims at night */}
            <directionalLight
                position={[10, 12, 10]}
                intensity={cfg.dirFill}
                color='#cdd6f4'
            />
        </group>
    );
}
