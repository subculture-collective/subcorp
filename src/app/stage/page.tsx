// Stage — main dashboard page composing all components
'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { StageHeader, type ViewMode } from './StageHeader';
import { StageSidebar } from './StageSidebar';
import type { ConnectionStatus } from './hooks';
import type { RoundtableSession, RoundtableTurn } from '@/lib/types';
import { MissionsList } from './MissionsList';
import { MissionPlayback } from './MissionPlayback';
import { Office3DScene } from './office3d/Office3DScene';
import { OfficeRoom } from './OfficeRoom';
import { ReplayController } from './ReplayController';
import { EventLogFeed } from './EventLogFeed';
import { SystemLogs } from './SystemLogs';
import { CostTracker } from './CostTracker';
import { MemoryExplorer } from './MemoryExplorer';
import { RelationshipGraph } from './RelationshipGraph';
import { ContentPipeline } from './ContentPipeline';
import { GovernancePanel } from './GovernancePanel';
import { DreamLog } from './DreamLog';
import { AgentDesigner } from './AgentDesigner';
import { MemoryArchaeology } from './MemoryArchaeology';
import { FileBrowser } from './FileBrowser';
import { StageErrorBoundary, SectionErrorBoundary } from './StageErrorBoundary';
import { AskTheRoom, type VoiceSessionInfo } from './AskTheRoom';
import { TranscriptViewer } from './TranscriptViewer';
import { VoiceChatInput } from './VoiceChatInput';
import { DailyDigest } from './DailyDigest';
import { NewsDigest } from './NewsDigest';
import { StageIntro } from './StageIntro';
import { SubscribeCTA } from '@/components/SubscribeCTA';
import { QuestionsView } from './QuestionsView';
import { NewspaperView } from './NewspaperView';
import { NewsletterView } from './NewsletterView';
import {
    MissionsListSkeleton,
    EventLogFeedSkeleton,
    SystemLogsSkeleton,
    FileBrowserSkeleton,
} from './StageSkeletons';

const VALID_VIEWS: ViewMode[] = [
    'feed',
    'questions',
    'missions',
    'office',
    'logs',
    'costs',
    'memories',
    'relationships',
    'content',
    'files',
    'governance',
    'dreams',
    'agent-designer',
    'archaeology',
    'newspaper',
    'newsletter',
];

const LAST_VIEW_KEY = 'subcult-last-view';

function isValidView(v: string | null): v is ViewMode {
    return v !== null && VALID_VIEWS.includes(v as ViewMode);
}

export default function StagePage() {
    return (
        <Suspense
            fallback={
                <div className='min-h-screen bg-[#11111b] flex items-center justify-center'>
                    <div className='text-zinc-500 text-sm'>Loading...</div>
                </div>
            }
        >
            <StageContent />
        </Suspense>
    );
}

function StageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Resolve view: URL param > localStorage > 'feed'
    const view = useMemo<ViewMode>(() => {
        const param = searchParams.get('view');
        if (isValidView(param)) return param;
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(LAST_VIEW_KEY);
            if (isValidView(saved)) return saved;
        }
        return 'feed';
    }, [searchParams]);

    const setView = useCallback(
        (v: ViewMode) => {
            localStorage.setItem(LAST_VIEW_KEY, v);
            const path = v === 'feed' ? '/stage' : `/stage?view=${v}`;
            router.replace(path);
        },
        [router],
    );

    const [playbackMissionId, setPlaybackMissionId] = useState<string | null>(
        null,
    );
    const [officeMode, setOfficeMode] = useState<'svg' | '3d'>('svg');
    const [connectionStatus, setConnectionStatus] =
        useState<ConnectionStatus>('connected');
    const handleConnectionStatus = useCallback((status: ConnectionStatus) => {
        setConnectionStatus(status);
    }, []);

    // ── Replay state ──
    const [replaySession, setReplaySession] =
        useState<RoundtableSession | null>(null);
    const [replayTurns, setReplayTurns] = useState<RoundtableTurn[]>([]);
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
    const isReplaying = replaySession !== null;

    const handleStartReplay = useCallback(
        (session: RoundtableSession, turns: RoundtableTurn[]) => {
            setReplaySession(session);
            setReplayTurns(turns);
            setCurrentTurnIndex(0);
            setView('office');
            setOfficeMode('svg');
        },
        [setView],
    );

    const handleStopReplay = useCallback(() => {
        setReplaySession(null);
        setReplayTurns([]);
        setCurrentTurnIndex(0);
    }, []);

    // ── Voice session state (Phase 2 STT) ──
    const [voiceSession, setVoiceSession] = useState<VoiceSessionInfo | null>(null);
    const handleVoiceSessionCreated = useCallback((info: VoiceSessionInfo) => {
        setVoiceSession(info);
    }, []);
    const handleVoiceSessionClose = useCallback(() => {
        setVoiceSession(null);
    }, []);

    // Build a minimal RoundtableSession object for the TranscriptViewer
    const voiceRoundtableSession = useMemo(() => {
        if (!voiceSession) return null;
        return {
            id: voiceSession.sessionId,
            format: voiceSession.format,
            topic: voiceSession.topic,
            participants: [] as string[],
            status: 'pending' as const,
            source: 'user_question',
            turn_count: 0,
            metadata: { voiceMode: true },
            created_at: new Date().toISOString(),
        };
    }, [voiceSession]);

    // ── Fullscreen 3D state ──
    const [office3DFullscreen, setOffice3DFullscreen] = useState(false);
    const toggleOffice3DFullscreen = useCallback(() => {
        setOffice3DFullscreen(prev => !prev);
    }, []);

    // Close fullscreen on Escape
    useEffect(() => {
        if (!office3DFullscreen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOffice3DFullscreen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [office3DFullscreen]);

    return (
        <StageErrorBoundary>
            <div className='min-h-screen bg-[#11111b] text-zinc-100 flex flex-col md:flex-row'>
                <StageSidebar view={view} onViewChange={setView} />
                <div className='flex-1 flex flex-col md:ml-36'>
                    <div className='mx-auto max-w-6xl w-full px-4 py-6 sm:px-6 lg:px-8 space-y-6'>
                    {/* Header with stats */}
                    <StageHeader
                        connectionStatus={view === 'feed' || view === 'office' ? connectionStatus : undefined}
                    />

                    {/* Mission playback overlay */}
                    {playbackMissionId && (
                        <SectionErrorBoundary label='Mission Playback'>
                            <MissionPlayback
                                missionId={playbackMissionId}
                                onClose={() => setPlaybackMissionId(null)}
                            />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Feed View ── */}
                    {view === 'feed' && (
                        <>
                            <StageIntro />
                            <SubscribeCTA variant='compact' source='stage' />
                            <AskTheRoom onVoiceSessionCreated={handleVoiceSessionCreated} />
                            {/* Voice session — live transcript with auto-speak */}
                            {voiceRoundtableSession && (
                                <SectionErrorBoundary label='Voice Session'>
                                    <TranscriptViewer
                                        session={voiceRoundtableSession}
                                        onClose={handleVoiceSessionClose}
                                        autoSpeakOnMount
                                    />
                                    {/* Voice chat reply input — only for voice_chat format */}
                                    {voiceSession?.format === 'voice_chat' && (
                                        <VoiceChatInput sessionId={voiceSession.sessionId} />
                                    )}
                                </SectionErrorBoundary>
                            )}
                            <SectionErrorBoundary label='Daily Digest'>
                                <DailyDigest />
                            </SectionErrorBoundary>
                            <SectionErrorBoundary label='News Digest'>
                                <NewsDigest />
                            </SectionErrorBoundary>
                            <SectionErrorBoundary label='Event Log'>
                                <Suspense fallback={<EventLogFeedSkeleton />}>
                                    <EventLogFeed
                                        onConnectionStatusAction={
                                            handleConnectionStatus
                                        }
                                        onStartReplay={handleStartReplay}
                                    />
                                </Suspense>
                            </SectionErrorBoundary>
                        </>
                    )}

                    {/* ── Questions View ── */}
                    {view === 'questions' && (
                        <SectionErrorBoundary label='Questions'>
                            <QuestionsView />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Missions View ── */}
                    {view === 'missions' && (
                        <SectionErrorBoundary label='Missions'>
                            <Suspense fallback={<MissionsListSkeleton />}>
                                <MissionsList
                                    onPlayback={id => setPlaybackMissionId(id)}
                                />
                            </Suspense>
                        </SectionErrorBoundary>
                    )}

                    {/* ── Office View (Three.js 2.5D) ── */}
                    {view === 'office' && (
                        <div className='space-y-4'>
                            {/* SVG / 3D toggle (hidden during replay) */}
                            {!isReplaying && (
                                <div className='flex items-center gap-2'>
                                    <div className='flex rounded-lg bg-zinc-800/50 p-0.5 border border-zinc-700/50'>
                                        <button
                                            onClick={() => setOfficeMode('svg')}
                                            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                                                officeMode === 'svg' ?
                                                    'bg-zinc-700 text-zinc-100'
                                                :   'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            SVG
                                        </button>
                                        <button
                                            onClick={() => setOfficeMode('3d')}
                                            className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                                                officeMode === '3d' ?
                                                    'bg-zinc-700 text-zinc-100'
                                                :   'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                        >
                                            3D
                                        </button>
                                    </div>
                                    <span className='text-[10px] text-zinc-600'>
                                        {officeMode === 'svg' ?
                                            'Pixel art (SVG)'
                                        :   'Three.js (experimental)'}
                                    </span>
                                </div>
                            )}

                            <SectionErrorBoundary label='Office'>
                                {officeMode === 'svg' || isReplaying ?
                                    <OfficeRoom
                                        replaySession={
                                            replaySession ?? undefined
                                        }
                                        replayTurns={replayTurns}
                                        currentTurnIndex={currentTurnIndex}
                                        isReplaying={isReplaying}
                                    />
                                :   <Office3DScene
                                        fullscreen={office3DFullscreen}
                                        onToggleFullscreen={
                                            toggleOffice3DFullscreen
                                        }
                                    />
                                }
                            </SectionErrorBoundary>

                            {/* Replay controller overlay */}
                            {isReplaying && replayTurns.length > 0 && (
                                <ReplayController
                                    turns={replayTurns}
                                    currentTurnIndex={currentTurnIndex}
                                    onTurnChange={setCurrentTurnIndex}
                                    onStop={handleStopReplay}
                                />
                            )}

                            <SectionErrorBoundary label='Event Log'>
                                <Suspense fallback={<EventLogFeedSkeleton />}>
                                    <EventLogFeed
                                        onConnectionStatusAction={
                                            handleConnectionStatus
                                        }
                                        onStartReplay={handleStartReplay}
                                    />
                                </Suspense>
                            </SectionErrorBoundary>
                        </div>
                    )}

                    {/* ── System Logs View ── */}
                    {view === 'logs' && (
                        <SectionErrorBoundary label='System Logs'>
                            <Suspense fallback={<SystemLogsSkeleton />}>
                                <SystemLogs />
                            </Suspense>
                        </SectionErrorBoundary>
                    )}

                    {/* ── Costs View ── */}
                    {view === 'costs' && (
                        <SectionErrorBoundary label='Cost Tracker'>
                            <CostTracker />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Memories View ── */}
                    {view === 'memories' && (
                        <SectionErrorBoundary label='Memory Explorer'>
                            <MemoryExplorer />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Relationships View ── */}
                    {view === 'relationships' && (
                        <SectionErrorBoundary label='Relationships'>
                            <RelationshipGraph />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Content View ── */}
                    {view === 'content' && (
                        <SectionErrorBoundary label='Content Pipeline'>
                            <ContentPipeline />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Files View ── */}
                    {view === 'files' && (
                        <SectionErrorBoundary label='File Browser'>
                            <Suspense fallback={<FileBrowserSkeleton />}>
                                <FileBrowser />
                            </Suspense>
                        </SectionErrorBoundary>
                    )}

                    {/* ── Governance View ── */}
                    {view === 'governance' && (
                        <SectionErrorBoundary label='Governance'>
                            <GovernancePanel />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Dreams View ── */}
                    {view === 'dreams' && (
                        <SectionErrorBoundary label='Dreams'>
                            <DreamLog />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Agent Designer View ── */}
                    {view === 'agent-designer' && (
                        <SectionErrorBoundary label='Agent Designer'>
                            <AgentDesigner />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Archaeology View ── */}
                    {view === 'archaeology' && (
                        <SectionErrorBoundary label='Memory Archaeology'>
                            <MemoryArchaeology />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Newspaper View ── */}
                    {view === 'newspaper' && (
                        <SectionErrorBoundary label='Newspaper'>
                            <NewspaperView />
                        </SectionErrorBoundary>
                    )}

                    {/* ── Newsletter View ── */}
                    {view === 'newsletter' && (
                        <SectionErrorBoundary label='Newsletter'>
                            <NewsletterView />
                        </SectionErrorBoundary>
                    )}

                    {/* Footer */}
                    <footer className='text-center text-[10px] text-zinc-700 py-4'>
                        SUBCORP &middot; multi-agent command center
                    </footer>
                    </div>
                </div>
            </div>
        </StageErrorBoundary>
    );
}
