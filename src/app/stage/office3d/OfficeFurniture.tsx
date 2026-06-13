// office3d/OfficeFurniture.tsx — desks, monitors, chairs, coffee machine, server rack, meeting table, couch, partitions, bookshelf, plants
'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { DESK_CONFIGS, PROPS, COLORS, AGENT_COLORS, SERVER_RACK_ACTIVE_LEDS } from './constants';
import { useOfficeMaterials, type OfficeMaterials } from './materials';
import type { AgentId } from '@/lib/types';

// ─── Shared geometries (module-level singletons, one GPU allocation each) ───
const GEO = {
    deskTop:      new THREE.BoxGeometry(2, 0.08, 1),
    deskLeg:      new THREE.BoxGeometry(0.06, 0.7, 0.06),
    monitor:      new THREE.BoxGeometry(0.9, 0.6, 0.05),
    monScreen:    new THREE.PlaneGeometry(0.8, 0.5),
    monStand:     new THREE.BoxGeometry(0.15, 0.08, 0.06),
    monBase:      new THREE.BoxGeometry(0.3, 0.02, 0.15),
    keyboard:     new THREE.BoxGeometry(0.5, 0.02, 0.15),
    chairSeat:    new THREE.BoxGeometry(0.5, 0.06, 0.5),
    chairBack:    new THREE.BoxGeometry(0.5, 0.6, 0.06),
    chairStem:    new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8),
    chairBase:    new THREE.CylinderGeometry(0.2, 0.2, 0.04, 8),
    serverBody:   new THREE.BoxGeometry(0.8, 2.4, 0.6),
    serverPanel:  new THREE.BoxGeometry(0.65, 0.2, 0.02),
    serverLed:    new THREE.SphereGeometry(0.025, 6, 6),
    plantPot:     new THREE.CylinderGeometry(0.2, 0.15, 0.4, 8),
    foliageLg:    new THREE.SphereGeometry(0.35, 8, 8),
    foliageSm:    new THREE.SphereGeometry(0.2, 8, 8),
    foliageMd:    new THREE.SphereGeometry(0.22, 8, 8),
    mChairSeat:   new THREE.BoxGeometry(0.4, 0.05, 0.4),
    mChairBack:   new THREE.BoxGeometry(0.4, 0.5, 0.05),
    mChairStem:   new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6),
    meetLeg:      new THREE.BoxGeometry(0.08, 0.72, 0.08),
    couchArm:     new THREE.BoxGeometry(0.15, 0.35, 0.8),
    couchLeg:     new THREE.BoxGeometry(0.08, 0.15, 0.08),
    partBody:     new THREE.BoxGeometry(0.1, 1.5, 3),
    partCap:      new THREE.BoxGeometry(0.14, 0.04, 3.04),
    shelfBoard:   new THREE.BoxGeometry(1.85, 0.04, 0.4),
} as const;

// ─── Desk with Monitor ───
function Desk({ agentId, position, onClick, mat }: {
    agentId: AgentId;
    position: [number, number, number];
    onClick?: () => void;
    mat: OfficeMaterials;
}) {
    const color = AGENT_COLORS[agentId];

    return (
        <group
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
            {/* Desk top */}
            <mesh position={[0, 0.7, 0]} castShadow material={mat.surface0} geometry={GEO.deskTop} />
            {/* Desk legs */}
            {[[-0.85, 0.35, -0.4], [0.85, 0.35, -0.4], [-0.85, 0.35, 0.4], [0.85, 0.35, 0.4]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} material={mat.surface1} geometry={GEO.deskLeg} />
            ))}
            {/* Monitor */}
            <mesh position={[0, 1.2, -0.2]} material={mat.darkScreen} geometry={GEO.monitor} />
            {/* Monitor screen (glow) — unique per agent */}
            <mesh position={[0, 1.2, -0.17]} geometry={GEO.monScreen}>
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={0.15}
                    transparent
                    opacity={0.3}
                />
            </mesh>
            {/* Monitor stand */}
            <mesh position={[0, 0.88, -0.2]} material={mat.surface1} geometry={GEO.monStand} />
            {/* Monitor base */}
            <mesh position={[0, 0.74, -0.2]} material={mat.surface1} geometry={GEO.monBase} />
            {/* Keyboard */}
            <mesh position={[0, 0.75, 0.15]} material={mat.surface0} geometry={GEO.keyboard} />
            {/* Chair */}
            <Chair position={[0, 0, 0.7]} color={color} mat={mat} />
        </group>
    );
}

function Chair({ position, color, mat }: { position: [number, number, number]; color: string; mat: OfficeMaterials }) {
    return (
        <group position={position}>
            {/* Seat — unique per agent color */}
            <mesh position={[0, 0.45, 0]} geometry={GEO.chairSeat}>
                <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            {/* Back — unique per agent color */}
            <mesh position={[0, 0.75, -0.2]} geometry={GEO.chairBack}>
                <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            {/* Stem */}
            <mesh position={[0, 0.2, 0]} material={mat.surface1} geometry={GEO.chairStem} />
            {/* Base */}
            <mesh position={[0, 0.02, 0]} material={mat.surface1} geometry={GEO.chairBase} />
        </group>
    );
}

// ─── Coffee Machine ───
function CoffeeMachine({ onClick, mat }: { onClick?: () => void; mat: OfficeMaterials }) {
    const steamRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (steamRef.current) {
            steamRef.current.position.y = 1.5 + Math.sin(clock.elapsedTime * 2) * 0.05;
            (steamRef.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + Math.sin(clock.elapsedTime * 3) * 0.05;
        }
    });

    return (
        <group
            position={PROPS.coffeeMachine}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
            <mesh position={[0, 0.5, 0]} material={mat.coffeeBody}>
                <boxGeometry args={[0.6, 1, 0.5]} />
            </mesh>
            <mesh position={[0, 1.05, 0]} material={mat.coffeeLid}>
                <boxGeometry args={[0.65, 0.1, 0.55]} />
            </mesh>
            {/* LED indicator — emissive, unique */}
            <mesh position={[0.2, 0.7, 0.26]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshStandardMaterial
                    color={COLORS.red}
                    emissive={COLORS.red}
                    emissiveIntensity={0.8}
                />
            </mesh>
            {/* Steam */}
            <mesh ref={steamRef} position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color='white' transparent opacity={0.15} />
            </mesh>
        </group>
    );
}

// ─── Server Rack ───
function ServerRack({ position, onClick, mat }: {
    position: [number, number, number];
    onClick?: () => void;
    mat: OfficeMaterials;
}) {
    const ledsRef = useRef<(THREE.Mesh | null)[]>([]);

    useFrame(({ clock }) => {
        ledsRef.current.forEach((led, i) => {
            if (led && i < SERVER_RACK_ACTIVE_LEDS) {
                const ledMat = led.material as THREE.MeshStandardMaterial;
                ledMat.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * (2 + i * 0.5)) * 0.3;
            }
        });
    });

    return (
        <group
            position={position}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
            <mesh position={[0, 1.2, 0]} material={mat.serverBody} geometry={GEO.serverBody} />
            {[0.4, 0.7, 1.0, 1.3, 1.6, 1.9, 2.2].map((y, i) => (
                <group key={i}>
                    <mesh position={[0, y, 0.31]} material={mat.serverPanel} geometry={GEO.serverPanel} />
                    {/* LEDs — animated emissive, must stay unique per instance */}
                    <mesh
                        ref={(el) => { ledsRef.current[i] = el; }}
                        position={[0.25, y, 0.33]}
                        geometry={GEO.serverLed}
                    >
                        <meshStandardMaterial
                            color={i < SERVER_RACK_ACTIVE_LEDS ? COLORS.green : COLORS.surface1}
                            emissive={i < SERVER_RACK_ACTIVE_LEDS ? COLORS.green : COLORS.surface1}
                            emissiveIntensity={i < SERVER_RACK_ACTIVE_LEDS ? 0.8 : 0.1}
                        />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

// ─── Plant ───
function Plant({ position, mat }: { position: [number, number, number]; mat: OfficeMaterials }) {
    return (
        <group position={position}>
            <mesh position={[0, 0.2, 0]} material={mat.wood} geometry={GEO.plantPot} />
            <mesh position={[0, 0.6, 0]} material={mat.foliageDark} geometry={GEO.foliageLg} />
            <mesh position={[-0.15, 0.5, 0.1]} material={mat.foliageLight} geometry={GEO.foliageSm} />
            <mesh position={[0.15, 0.55, -0.05]} material={mat.foliageDark} geometry={GEO.foliageMd} />
        </group>
    );
}

// ─── Meeting Table ───
function MeetingTable({ mat }: { mat: OfficeMaterials }) {
    return (
        <group position={PROPS.meetingTable}>
            {/* Table top */}
            <mesh position={[0, 0.72, 0]} castShadow material={mat.surface0}>
                <boxGeometry args={[4, 0.08, 2]} />
            </mesh>
            {/* Table legs */}
            {[[-1.7, 0.36, -0.8], [1.7, 0.36, -0.8], [-1.7, 0.36, 0.8], [1.7, 0.36, 0.8]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} material={mat.surface1} geometry={GEO.meetLeg} />
            ))}
            {/* 6 chairs around the table */}
            {[
                [-1.2, 0, -1.5], [0, 0, -1.5], [1.2, 0, -1.5],
                [-1.2, 0, 1.5], [0, 0, 1.5], [1.2, 0, 1.5],
            ].map((pos, i) => (
                <MeetingChair key={i} position={pos as [number, number, number]} facingBack={i < 3} mat={mat} />
            ))}
        </group>
    );
}

function MeetingChair({ position, facingBack, mat }: {
    position: [number, number, number];
    facingBack: boolean;
    mat: OfficeMaterials;
}) {
    return (
        <group position={position} rotation={[0, facingBack ? 0 : Math.PI, 0]}>
            <mesh position={[0, 0.4, 0]} material={mat.surface2} geometry={GEO.mChairSeat} />
            <mesh position={[0, 0.65, -0.17]} material={mat.surface2} geometry={GEO.mChairBack} />
            <mesh position={[0, 0.2, 0]} material={mat.surface1} geometry={GEO.mChairStem} />
        </group>
    );
}

// ─── Couch ───
function Couch({ mat }: { mat: OfficeMaterials }) {
    return (
        <group position={PROPS.couch}>
            {/* Seat */}
            <mesh position={[0, 0.3, 0]} material={mat.couchFabric}>
                <boxGeometry args={[2.5, 0.3, 0.8]} />
            </mesh>
            {/* Back */}
            <mesh position={[0, 0.6, -0.35]} material={mat.couchFabric}>
                <boxGeometry args={[2.5, 0.5, 0.15]} />
            </mesh>
            {/* Arms */}
            <mesh position={[-1.2, 0.45, 0]} material={mat.couchFabric} geometry={GEO.couchArm} />
            <mesh position={[1.2, 0.45, 0]} material={mat.couchFabric} geometry={GEO.couchArm} />
            {/* Legs */}
            {[[-1, 0.08, -0.3], [1, 0.08, -0.3], [-1, 0.08, 0.3], [1, 0.08, 0.3]].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]} material={mat.surface1} geometry={GEO.couchLeg} />
            ))}
        </group>
    );
}

// ─── Partition Wall ───
function PartitionWall({ position, mat }: { position: [number, number, number]; mat: OfficeMaterials }) {
    return (
        <group position={position}>
            <mesh position={[0, 0.75, 0]} material={mat.surface0} geometry={GEO.partBody} />
            <mesh position={[0, 1.52, 0]} material={mat.surface1} geometry={GEO.partCap} />
        </group>
    );
}

// ─── Bookshelf ───
function Bookshelf({ mat }: { mat: OfficeMaterials }) {
    return (
        <group position={PROPS.bookshelf}>
            {/* Frame */}
            <mesh position={[0, 1.2, 0]} material={mat.darkWood}>
                <boxGeometry args={[2, 2.4, 0.5]} />
            </mesh>
            {/* Shelves */}
            {[0.3, 0.8, 1.3, 1.8].map((y, i) => (
                <mesh key={i} position={[0, y, 0.05]} material={mat.surface0} geometry={GEO.shelfBoard} />
            ))}
            {/* Book groups — each has a unique color and width */}
            {[
                { y: 0.5, x: -0.5, w: 0.5, color: COLORS.red },
                { y: 0.5, x: 0.2, w: 0.6, color: COLORS.blue },
                { y: 1.0, x: -0.3, w: 0.7, color: COLORS.green },
                { y: 1.0, x: 0.5, w: 0.3, color: COLORS.accent },
                { y: 1.5, x: -0.4, w: 0.4, color: COLORS.peach },
                { y: 1.5, x: 0.3, w: 0.5, color: COLORS.lavender },
                { y: 2.0, x: 0, w: 0.8, color: COLORS.sapphire },
            ].map((book, i) => (
                <mesh key={i} position={[book.x, book.y, 0.1]}>
                    <boxGeometry args={[book.w, 0.35, 0.25]} />
                    <meshStandardMaterial color={book.color} roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

// ─── Main Furniture Export ───
export function OfficeFurniture({
    onClickDesk,
    onClickCoffee,
    onClickServer,
}: {
    onClickDesk?: (agentId: AgentId) => void;
    onClickCoffee?: () => void;
    onClickServer?: () => void;
}) {
    const mat = useOfficeMaterials();

    return (
        <group>
            {/* Desks (in 3 pods) */}
            {DESK_CONFIGS.map(cfg => (
                <Desk
                    key={cfg.agentId}
                    agentId={cfg.agentId}
                    position={cfg.position}
                    onClick={() => onClickDesk?.(cfg.agentId)}
                    mat={mat}
                />
            ))}

            {/* Meeting Table */}
            <MeetingTable mat={mat} />

            {/* Coffee Machine */}
            <CoffeeMachine onClick={onClickCoffee} mat={mat} />

            {/* Couch */}
            <Couch mat={mat} />

            {/* Server Racks */}
            <ServerRack position={PROPS.serverRack} onClick={onClickServer} mat={mat} />
            <ServerRack position={PROPS.serverRack2} mat={mat} />

            {/* Partition Walls */}
            <PartitionWall position={PROPS.partition1} mat={mat} />
            <PartitionWall position={PROPS.partition2} mat={mat} />

            {/* Bookshelf */}
            <Bookshelf mat={mat} />

            {/* Plants */}
            <Plant position={PROPS.plant1} mat={mat} />
            <Plant position={PROPS.plant2} mat={mat} />
            <Plant position={PROPS.plant3} mat={mat} />
            <Plant position={PROPS.plant4} mat={mat} />
        </group>
    );
}
