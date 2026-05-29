// office3d/Office3DScene.tsx — main Three.js scene container with OrbitControls and fullscreen
'use client';

import { Suspense, useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { OfficeFloor } from './OfficeFloor';
import { OfficeWalls } from './OfficeWalls';
import { OfficeLighting } from './OfficeLighting';
import { OfficeFurniture } from './OfficeFurniture';
import { OfficeEnvironment } from './OfficeEnvironment';
import { OfficeWhiteboard } from './OfficeWhiteboard';
import { AgentSprite } from './AgentSprite';
import { DroidSprite } from './DroidSprite';
import { OverlayPanels } from './OverlayPanels';
import { useOfficeState } from './useOfficeState';
import { useTimeOfDay } from '../hooks';
import { CAMERA, COLORS } from './constants';
import type { AgentId } from '@/lib/types';

function OfficeSceneContent({
    period,
    state,
}: {
    period: 'day' | 'dusk' | 'night';
    state: ReturnType<typeof useOfficeState>;
}) {
    const {
        agents,
        stats,
        setSelected,
        setDraggingAgent,
        setHoveredObject,
        moveAgent,
    } = state;

    const isDragging = useRef(false);
    const { camera, gl } = useThree();
    const controlsRef = useRef<React.ElementRef<typeof OrbitControls> | null>(null);
    const dragTools = useRef({
        plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        raycaster: new THREE.Raycaster(),
        pointer: new THREE.Vector2(),
        hit: new THREE.Vector3(),
    });

    const handleDeskClick = useCallback(
        (agentId: AgentId) => {
            state.setSelected({ type: 'desk', agentId });
        },
        [state],
    );

    const handleWhiteboardClick = useCallback(() => {
        state.setSelected({ type: 'whiteboard' });
    }, [state]);

    const handleCoffeeClick = useCallback(() => {
        state.setSelected({ type: 'coffee' });
    }, [state]);

    const handleServerClick = useCallback(() => {
        state.setSelected({ type: 'server' });
    }, [state]);

    const handleAgentClick = useCallback(
        (agentId: AgentId) => {
            if (!isDragging.current) {
                setSelected({ type: 'agent', agentId });
            }
        },
        [setSelected],
    );

    const handleAgentPointerDown = useCallback(
        (agentId: AgentId) => {
            isDragging.current = false;
            setDraggingAgent(agentId);

            const canvas = gl.domElement;
            const dt = dragTools.current;

            const handlePointerMove = (ev: PointerEvent) => {
                isDragging.current = true;
                if (controlsRef.current) controlsRef.current.enabled = false;
                const rect = canvas.getBoundingClientRect();
                dt.pointer.set(
                    ((ev.clientX - rect.left) / rect.width) * 2 - 1,
                    -((ev.clientY - rect.top) / rect.height) * 2 + 1,
                );
                dt.raycaster.setFromCamera(dt.pointer, camera);
                if (dt.raycaster.ray.intersectPlane(dt.plane, dt.hit)) {
                    const x = THREE.MathUtils.clamp(dt.hit.x, -18, 18);
                    const z = THREE.MathUtils.clamp(dt.hit.z, -10, 10);
                    moveAgent(agentId, x, z);
                }
            };

            const handlePointerUp = () => {
                setDraggingAgent(null);
                if (controlsRef.current) controlsRef.current.enabled = true;
                document.body.style.cursor = 'auto';
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', handlePointerUp);
                setTimeout(() => { isDragging.current = false; }, 50);
            };

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        },
        [setDraggingAgent, gl, camera, moveAgent],
    );

    const handleFloorClick = useCallback(() => {
        setSelected(null);
    }, [setSelected]);

    return (
        <>
            {/* Camera controls */}
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enableDamping
                dampingFactor={0.1}
                maxPolarAngle={Math.PI / 2.2}
                minZoom={10}
                maxZoom={80}
                target={[0, 0, 0]}
            />

            {/* Lighting */}
            <OfficeLighting period={period} />

            {/* Procedural environment map for PBR reflections */}
            <OfficeEnvironment period={period} />

            {/* Environment */}
            <color attach='background' args={[COLORS.crust]} />
            <fog attach='fog' args={[COLORS.crust, 40, 80]} />

            {/* Floor with click plane for deselection */}
            <group>
                <OfficeFloor />
                <mesh
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.01, 0]}
                    onClick={handleFloorClick}
                >
                    <planeGeometry args={[100, 100]} />
                    <meshBasicMaterial visible={false} />
                </mesh>
            </group>

            {/* Walls */}
            <OfficeWalls period={period} />

            {/* Furniture */}
            <OfficeFurniture
                onClickDesk={handleDeskClick}
                onClickCoffee={handleCoffeeClick}
                onClickServer={handleServerClick}
            />

            {/* Whiteboard */}
            <OfficeWhiteboard
                stats={stats}
                onClick={handleWhiteboardClick}
            />

            {/* Agents */}
            {agents.map(agent => (
                <AgentSprite
                    key={agent.id}
                    agent={agent}
                    onClick={() => handleAgentClick(agent.id)}
                    onPointerDown={() => handleAgentPointerDown(agent.id)}
                    onPointerEnter={() => { setHoveredObject(`agent:${agent.id}`); document.body.style.cursor = 'pointer'; }}
                    onPointerLeave={() => { setHoveredObject(null); document.body.style.cursor = 'auto'; }}
                />
            ))}

            {/* Droids */}
            {state.droids.map(droid => (
                <DroidSprite key={droid.droid_id} droidId={droid.droid_id} task={droid.task} />
            ))}

            {/* Post-processing */}
            <EffectComposer>
                <Bloom
                    luminanceThreshold={0.6}
                    luminanceSmoothing={0.4}
                    intensity={period === 'night' ? 0.8 : period === 'dusk' ? 0.5 : 0.3}
                    mipmapBlur
                />
                <Vignette
                    offset={0.3}
                    darkness={period === 'night' ? 0.7 : period === 'dusk' ? 0.5 : 0.35}
                />
            </EffectComposer>
        </>
    );
}

// ─── Loading fallback ───
function LoadingScreen() {
    return (
        <div className='flex items-center justify-center h-full bg-zinc-900/50'>
            <div className='text-center space-y-2'>
                <div className='text-2xl'>🏢</div>
                <div className='text-xs text-zinc-500 animate-pulse'>Loading office...</div>
            </div>
        </div>
    );
}

// ─── Agent Status Bar (below canvas) ───
function AgentStatusBar({
    agents,
    sessions,
    droids,
}: {
    agents: ReturnType<typeof useOfficeState>['agents'];
    sessions: ReturnType<typeof useOfficeState>['sessions'];
    droids: ReturnType<typeof useOfficeState>['droids'];
}) {
    const activeSession = sessions.find(
        s => s.status === 'running' || s.status === 'pending',
    );
    const lastCompleted = sessions.find(s => s.status === 'completed');

    return (
        <div className='px-3 py-2 border-t border-zinc-800/50 bg-zinc-900/30'>
            <div className='flex items-center gap-3 overflow-x-auto'>
                {agents.map(agent => {
                    const inActiveSession = activeSession?.participants.includes(agent.id);
                    return (
                        <div key={agent.id} className='flex items-center gap-1.5 shrink-0'>
                            <div
                                className={`w-1.5 h-1.5 rounded-full ${inActiveSession ? 'animate-pulse' : ''}`}
                                style={{ backgroundColor: agent.color }}
                            />
                            <span
                                className='text-[10px] font-semibold'
                                style={{ color: agent.color }}
                            >
                                {agent.name}
                            </span>
                            <span className='text-[9px] text-zinc-600'>
                                {inActiveSession ? 'in session' : agent.behavior}
                            </span>
                        </div>
                    );
                })}
                {droids.length > 0 && (
                    <div className='flex items-center gap-1 shrink-0 ml-1 px-1.5 py-0.5 rounded bg-zinc-800/50 border border-zinc-700/30'>
                        <span className='text-[10px]'>{'🤖'}</span>
                        <span className='text-[10px] font-medium' style={{ color: '#74c7ec' }}>
                            {droids.length} droid{droids.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
                {activeSession && (
                    <div className='ml-auto flex items-center gap-1.5 shrink-0'>
                        <span className='relative flex h-1.5 w-1.5'>
                            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-75' />
                            <span className='relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-blue' />
                        </span>
                        <span className='text-[10px] text-accent-blue font-medium'>
                            {activeSession.format}
                        </span>
                        <span className='text-[9px] text-zinc-600 max-w-40 truncate'>
                            {activeSession.topic}
                        </span>
                    </div>
                )}
                {!activeSession && lastCompleted && (
                    <div className='ml-auto shrink-0'>
                        <span className='text-[9px] text-zinc-600'>
                            Last: {lastCompleted.format}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── WebGL Check ───
function WebGLFallback() {
    return (
        <div className='flex h-full items-center justify-center px-4 text-center text-xs text-zinc-400'>
            Your browser does not support WebGL, which is required to display the
            interactive 3D office. Please use a modern browser and ensure that
            hardware acceleration is enabled.
        </div>
    );
}

function checkWebGL(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
        return false;
    }
}

// ─── Main Export ───
export function Office3DScene({ fullscreen, onToggleFullscreen }: {
    fullscreen?: boolean;
    onToggleFullscreen?: () => void;
}) {
    const period = useTimeOfDay();
    const state = useOfficeState();
    const [webglSupported] = useState(checkWebGL);

    const containerClass = fullscreen
        ? 'fixed inset-0 z-50 bg-[#11111b]'
        : 'rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden';

    const canvasHeight = fullscreen
        ? 'calc(100vh - 80px)'
        : 'min(600px, 75vh)';

    return (
        <div className={containerClass}>
            {/* Header */}
            <div className='flex items-center justify-between px-4 py-2 border-b border-zinc-800'>
                <span className='text-xs font-medium text-zinc-400'>
                    The Office
                </span>
                <div className='flex items-center gap-3'>
                    <span className='text-[10px] text-zinc-600'>
                        {period === 'day' ? '☀️ Day' : period === 'dusk' ? '🌅 Dusk' : '🌙 Night'}
                    </span>
                    <span className='text-[10px] text-zinc-700'>
                        {state.agents.filter(a => a.behavior !== 'idle').length} agents active
                    </span>
                    {onToggleFullscreen && (
                        <button
                            onClick={onToggleFullscreen}
                            className='text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-2 sm:px-1.5 sm:py-0.5 rounded border border-zinc-700/50 hover:border-zinc-600'
                            title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
                        >
                            {fullscreen ? '✕ Exit' : '⛶ Fullscreen'}
                        </button>
                    )}
                </div>
            </div>

            {/* 3D Canvas */}
            <div
                className='relative'
                style={{ height: canvasHeight }}
                role='region'
                aria-label='Interactive 3D office scene showing agent desks, behaviors, and operational stats'
            >
                {!webglSupported ? (
                    <WebGLFallback />
                ) : (
                    <Suspense fallback={<LoadingScreen />}>
                        <Canvas
                            orthographic
                            camera={{
                                position: CAMERA.position,
                                zoom: CAMERA.zoom,
                                near: CAMERA.near,
                                far: CAMERA.far,
                            }}
                            style={{ background: COLORS.crust }}
                            gl={{ antialias: true, alpha: false }}
                            dpr={[1, 2]}
                        >
                            <OfficeSceneContent period={period} state={state} />
                        </Canvas>
                    </Suspense>
                )}

                {/* Overlay panels (HTML positioned over canvas) */}
                <OverlayPanels
                    selected={state.selected}
                    agents={state.agents}
                    stats={state.stats}
                    events={state.recentEvents}
                    missions={state.activeMissions}
                    onClose={() => state.setSelected(null)}
                />

                {/* Hover tooltip */}
                {state.hoveredObject && (
                    <div className='absolute bottom-3 left-3 px-2 py-1 rounded bg-zinc-800/90 border border-zinc-700/50 text-[10px] text-zinc-400 pointer-events-none'>
                        {state.hoveredObject.startsWith('agent:')
                            ? `Click to view ${state.hoveredObject.replace('agent:', '')}`
                            : state.hoveredObject
                        }
                    </div>
                )}

                {/* Controls hint */}
                <div className='absolute bottom-3 right-3 px-2 py-1 rounded bg-zinc-800/60 text-[9px] text-zinc-600 pointer-events-none hidden sm:block'>
                    Drag to rotate · Scroll to zoom · Right-drag to pan
                </div>
            </div>

            {/* Status bar */}
            <AgentStatusBar agents={state.agents} sessions={state.sessions} droids={state.droids} />
        </div>
    );
}
