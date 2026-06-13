// useTTS — React hook for TTS playback control
// ElevenLabs-first with progressive prefetch, browser TTS fallback
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RoundtableTurn } from '@/lib/types';
import { clientLogger } from '@/lib/client-logger';

const log = clientLogger.child({ component: 'useTTS' });

// Lazy imports — browser TTS modules reference window.speechSynthesis
let _providerModule: typeof import('@/lib/tts/provider') | null = null;
let _profilesModule: typeof import('@/lib/tts/profiles') | null = null;

async function loadBrowserTTSModules() {
    if (!_providerModule) {
        _providerModule = await import('@/lib/tts/provider');
    }
    if (!_profilesModule) {
        _profilesModule = await import('@/lib/tts/profiles');
    }
    return {
        getTTSProvider: _providerModule.getTTSProvider,
        getVoiceProfile: _profilesModule.getVoiceProfile,
    };
}

// ─── Types ───

export interface TTSState {
    /** Whether any speech is currently playing */
    isPlaying: boolean;
    /** Index of the currently speaking turn (-1 if none) */
    activeTurnIndex: number;
    /** Whether TTS is available (server or browser) */
    isAvailable: boolean;
    /** Whether user interaction is needed to unlock audio */
    needsUnlock: boolean;
    /** Whether ElevenLabs server TTS is available */
    isServerTTS: boolean;
    /** Accumulated per-turn audio blobs for download */
    audioBuffers: Blob[];
    /** Turn index where playback was stopped (-1 if not stopped mid-playback) */
    stoppedAtIndex: number;
    /** Whether MP3 generation (without playback) is in progress */
    isGenerating: boolean;
    /** Number of turns generated so far */
    generationProgress: number;
    /** Total turns to generate */
    generationTotal: number;
    /** Whether a cached MP3 exists for the current session */
    hasCachedAudio: boolean;
    /** Whether the last generation attempt failed */
    generationError: boolean;
}

export interface TTSControls {
    /** Play a single turn's dialogue */
    playTurn: (turn: RoundtableTurn, index: number) => void;
    /** Play all turns sequentially from a given index */
    playAll: (turns: RoundtableTurn[], fromIndex?: number) => void;
    /** Stop all playback (remembers position for resume) */
    stop: () => void;
    /** Try to unlock audio (call from a click handler) */
    unlock: () => void;
    /** Download accumulated audio as a single MP3 */
    downloadAudio: (sessionTopic?: string) => void;
    /** Generate MP3 from all turns without playback, then auto-download */
    generateAudio: (sessionId: string, turns: RoundtableTurn[], sessionTopic?: string) => void;
    /** Cancel an in-progress generation */
    cancelGeneration: () => void;
    /** Check if cached audio exists for a session */
    checkCache: (sessionId: string) => Promise<void>;
    /** Delete cache and re-generate audio */
    regenerateAudio: (sessionId: string, turns: RoundtableTurn[], sessionTopic?: string) => void;
}

// ─── Helpers ───

async function fetchTTSAudio(
    agentId: string,
    text: string,
    signal?: AbortSignal,
): Promise<Blob | null> {
    try {
        const res = await fetch('/api/tts/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId, text }),
            signal,
        });
        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            log.warn('TTS synthesis failed', { status: res.status, body: errBody });
            return null;
        }
        return await res.blob();
    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            log.warn('TTS fetch failed', { error: (err as Error).message });
        }
        return null;
    }
}

/**
 * Play an audio blob on a reusable HTMLAudioElement.
 * Reusing the same element avoids autoplay-policy blocks on subsequent plays —
 * once the element is "unlocked" by the first user-gesture-initiated play(),
 * subsequent play() calls on the same element are allowed.
 */
function playAudioBlob(
    audio: HTMLAudioElement,
    blob: Blob,
    signal?: AbortSignal,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);

        const cleanup = () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            if (signal) signal.removeEventListener('abort', onAbort);
            audio.pause();
            audio.removeAttribute('src');
            audio.load(); // reset internal state
            URL.revokeObjectURL(url);
        };

        const onEnded = () => {
            cleanup();
            resolve();
        };

        const onError = () => {
            cleanup();
            reject(new Error('Audio playback error'));
        };

        const onAbort = () => {
            cleanup();
            reject(new DOMException('Aborted', 'AbortError'));
        };

        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        if (signal) signal.addEventListener('abort', onAbort);

        audio.src = url;
        audio.play().catch(err => {
            cleanup();
            reject(err);
        });
    });
}

function sanitizeFilename(s: string): string {
    return s
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase()
        .slice(0, 80);
}

// ─── Hook ───

export function useTTS(): [TTSState, TTSControls] {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTurnIndex, setActiveTurnIndex] = useState(-1);
    const [isAvailable, setIsAvailable] = useState(false);
    const [needsUnlock, setNeedsUnlock] = useState(false);
    const [isServerTTS, setIsServerTTS] = useState(false);
    const [audioBuffers, setAudioBuffers] = useState<Blob[]>([]);
    const [stoppedAtIndex, setStoppedAtIndex] = useState(-1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationTotal, setGenerationTotal] = useState(0);
    const [hasCachedAudio, setHasCachedAudio] = useState(false);
    const [generationError, setGenerationError] = useState(false);

    const abortRef = useRef<AbortController | null>(null);
    const genAbortRef = useRef<AbortController | null>(null);
    // Reusable audio element — created once, avoids autoplay-policy blocks
    const audioElRef = useRef<HTMLAudioElement | null>(null);
    // Track whether current playback is a playAll (vs single playTurn)
    const isPlayAllRef = useRef(false);
    // Track the current active index in a ref so stop() can read it synchronously
    const activeTurnRef = useRef(-1);

    /** Lazily create & return the shared audio element. */
    const getAudioEl = useCallback(() => {
        if (!audioElRef.current) {
            audioElRef.current = new Audio();
        }
        return audioElRef.current;
    }, []);

    // Detect availability on mount
    useEffect(() => {
        let cancelled = false;

        // Check server TTS availability via GET (200 = available, 503 = no API key)
        fetch('/api/tts/synthesize')
            .then(res => {
                if (cancelled) return;
                const serverAvailable = res.ok;
                setIsServerTTS(serverAvailable);
                if (serverAvailable) setIsAvailable(true);
            })
            .catch(() => {
                // Network error — server TTS unavailable
            });

        // Check browser TTS
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsAvailable(true);
        }

        return () => {
            cancelled = true;
        };
    }, []);

    const stop = useCallback(() => {
        // Save position if we're in a playAll sequence
        if (isPlayAllRef.current && activeTurnRef.current >= 0) {
            setStoppedAtIndex(activeTurnRef.current);
        }

        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        // Also cancel browser TTS in case fallback was active
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        isPlayAllRef.current = false;
        setIsPlaying(false);
        setActiveTurnIndex(-1);
    }, []);

    const playTurnWithBrowser = useCallback(
        async (turn: RoundtableTurn): Promise<void> => {
            const { getTTSProvider, getVoiceProfile } =
                await loadBrowserTTSModules();
            const provider = getTTSProvider();
            const profile = getVoiceProfile(turn.speaker);
            await provider.speak(turn.dialogue, profile);
        },
        [],
    );

    const playTurn = useCallback(
        async (turn: RoundtableTurn, index: number) => {
            // Abort any current playback
            if (abortRef.current) abortRef.current.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            isPlayAllRef.current = false;
            setStoppedAtIndex(-1);

            setIsPlaying(true);
            setActiveTurnIndex(index);
            activeTurnRef.current = index;
            setNeedsUnlock(false);

            try {
                let played = false;
                if (isServerTTS) {
                    const blob = await fetchTTSAudio(
                        turn.speaker,
                        turn.dialogue,
                        controller.signal,
                    );
                    if (blob && !controller.signal.aborted) {
                        setAudioBuffers(prev => [...prev, blob]);
                        try {
                            await playAudioBlob(
                                getAudioEl(),
                                blob,
                                controller.signal,
                            );
                            played = true;
                        } catch {
                            // playback failed — fall through to browser
                        }
                    }
                }

                if (!played && !controller.signal.aborted) {
                    await playTurnWithBrowser(turn);
                }

                if (!controller.signal.aborted) {
                    setIsPlaying(false);
                    setActiveTurnIndex(-1);
                    activeTurnRef.current = -1;
                }
            } catch {
                if (!controller.signal.aborted) {
                    setNeedsUnlock(true);
                    setIsPlaying(false);
                    setActiveTurnIndex(-1);
                    activeTurnRef.current = -1;
                }
            }
        },
        [isServerTTS, getAudioEl, playTurnWithBrowser],
    );

    const playAll = useCallback(
        async (turns: RoundtableTurn[], fromIndex = 0) => {
            // Abort any current playback
            if (abortRef.current) abortRef.current.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            isPlayAllRef.current = true;

            setIsPlaying(true);
            setNeedsUnlock(false);
            setStoppedAtIndex(-1);
            if (fromIndex === 0) {
                setAudioBuffers([]);
            }

            // Shared audio element for the whole sequence
            const audioEl = getAudioEl();

            try {
                if (isServerTTS) {
                    // Progressive prefetch pipeline
                    let nextFetch: Promise<Blob | null> | null = null;

                    for (let i = fromIndex; i < turns.length; i++) {
                        if (controller.signal.aborted) break;

                        setActiveTurnIndex(i);
                        activeTurnRef.current = i;

                        // Use prefetched blob or fetch current
                        let blob: Blob | null;
                        if (nextFetch) {
                            blob = await nextFetch;
                            nextFetch = null;
                        } else {
                            blob = await fetchTTSAudio(
                                turns[i].speaker,
                                turns[i].dialogue,
                                controller.signal,
                            );
                        }

                        if (controller.signal.aborted) break;

                        // Start prefetching next turn
                        if (i + 1 < turns.length) {
                            nextFetch = fetchTTSAudio(
                                turns[i + 1].speaker,
                                turns[i + 1].dialogue,
                                controller.signal,
                            );
                        }

                        if (blob) {
                            setAudioBuffers(prev => [...prev, blob]);
                            try {
                                await playAudioBlob(
                                    audioEl,
                                    blob,
                                    controller.signal,
                                );
                            } catch {
                                // Aborted or playback error — stop the loop
                                break;
                            }
                        } else {
                            // Server failed for this turn — try browser fallback
                            try {
                                await playTurnWithBrowser(turns[i]);
                            } catch {
                                break;
                            }
                        }
                    }
                } else {
                    // Browser TTS only
                    const { getTTSProvider, getVoiceProfile } =
                        await loadBrowserTTSModules();
                    const provider = getTTSProvider();
                    provider.stop();

                    for (let i = fromIndex; i < turns.length; i++) {
                        if (controller.signal.aborted) break;
                        setActiveTurnIndex(i);
                        activeTurnRef.current = i;
                        const profile = getVoiceProfile(turns[i].speaker);
                        await provider.speak(turns[i].dialogue, profile);
                    }
                }

                if (!controller.signal.aborted) {
                    isPlayAllRef.current = false;
                    setIsPlaying(false);
                    setActiveTurnIndex(-1);
                    activeTurnRef.current = -1;
                }
            } catch {
                if (!controller.signal.aborted) {
                    isPlayAllRef.current = false;
                    setNeedsUnlock(true);
                    setIsPlaying(false);
                    setActiveTurnIndex(-1);
                    activeTurnRef.current = -1;
                }
            }
        },
        [isServerTTS, getAudioEl, playTurnWithBrowser],
    );

    const unlock = useCallback(async () => {
        try {
            const { getTTSProvider } = await loadBrowserTTSModules();
            const provider = getTTSProvider();
            await provider.speak('', {
                pitch: 1,
                rate: 1,
                volume: 0,
                preferredVoiceNames: [],
            });
            setNeedsUnlock(false);
        } catch {
            // Still locked
        }
    }, []);

    const downloadAudio = useCallback(
        (sessionTopic?: string) => {
            if (audioBuffers.length === 0) return;

            const combined = new Blob(audioBuffers, { type: 'audio/mpeg' });
            const url = URL.createObjectURL(combined);
            const a = document.createElement('a');
            a.href = url;
            a.download = sessionTopic
                ? `${sanitizeFilename(sessionTopic)}.mp3`
                : 'transcript.mp3';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },
        [audioBuffers],
    );

    const cancelGeneration = useCallback(() => {
        if (genAbortRef.current) {
            genAbortRef.current.abort();
            genAbortRef.current = null;
        }
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationTotal(0);
    }, []);

    const checkCache = useCallback(async (sessionId: string) => {
        try {
            const res = await fetch(`/api/tts/session/${sessionId}`, { method: 'HEAD' });
            setHasCachedAudio(res.ok);
        } catch {
            setHasCachedAudio(false);
        }
    }, []);

    const triggerDownload = useCallback((blob: Blob, sessionTopic?: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sessionTopic
            ? `${sanitizeFilename(sessionTopic)}.mp3`
            : 'transcript.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, []);

    const generateAudio = useCallback(
        async (sessionId: string, turns: RoundtableTurn[], sessionTopic?: string) => {
            if (turns.length === 0) return;

            setGenerationError(false);

            // Check cache first — if cached, download directly
            try {
                const cacheRes = await fetch(`/api/tts/session/${sessionId}`);
                if (cacheRes.ok) {
                    const blob = await cacheRes.blob();
                    triggerDownload(blob, sessionTopic);
                    setHasCachedAudio(true);
                    return;
                }
            } catch {
                // Cache miss or network error — proceed with generation
            }

            // Cancel any existing generation
            if (genAbortRef.current) genAbortRef.current.abort();
            const controller = new AbortController();
            genAbortRef.current = controller;

            setIsGenerating(true);
            setGenerationProgress(0);
            setGenerationTotal(turns.length);

            const blobs: Blob[] = [];

            try {
                for (let i = 0; i < turns.length; i++) {
                    if (controller.signal.aborted) break;

                    const blob = await fetchTTSAudio(
                        turns[i].speaker,
                        turns[i].dialogue,
                        controller.signal,
                    );

                    if (controller.signal.aborted) break;

                    if (blob) {
                        blobs.push(blob);
                    }
                    setGenerationProgress(i + 1);
                }

                if (!controller.signal.aborted && blobs.length > 0) {
                    const combined = new Blob(blobs, { type: 'audio/mpeg' });
                    triggerDownload(combined, sessionTopic);

                    // Upload to cache (fire-and-forget)
                    fetch(`/api/tts/session/${sessionId}`, {
                        method: 'POST',
                        body: combined,
                    })
                        .then(() => setHasCachedAudio(true))
                        .catch(() => {/* cache upload failed — non-critical */});
                }
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setGenerationError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsGenerating(false);
                    setGenerationProgress(0);
                    setGenerationTotal(0);
                    if (blobs.length === 0) {
                        setGenerationError(true);
                    }
                }
            }
        },
        [triggerDownload],
    );

    const regenerateAudio = useCallback(
        async (sessionId: string, turns: RoundtableTurn[], sessionTopic?: string) => {
            // Delete cache first
            try {
                await fetch(`/api/tts/session/${sessionId}`, { method: 'DELETE' });
            } catch {
                // Ignore — file may not exist
            }
            setHasCachedAudio(false);
            setGenerationError(false);
            generateAudio(sessionId, turns, sessionTopic);
        },
        [generateAudio],
    );

    return [
        {
            isPlaying,
            activeTurnIndex,
            isAvailable,
            needsUnlock,
            isServerTTS,
            audioBuffers,
            stoppedAtIndex,
            isGenerating,
            generationProgress,
            generationTotal,
            hasCachedAudio,
            generationError,
        },
        { playTurn, playAll, stop, unlock, downloadAudio, generateAudio, cancelGeneration, checkCache, regenerateAudio },
    ];
}
