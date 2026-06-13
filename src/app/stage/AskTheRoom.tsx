// AskTheRoom — collapsible text input for submitting user questions to the collective
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ConversationFormat } from '@/lib/types';
import { SubcorpAvatar } from './AgentAvatar';
import { useSpeechRecognition } from './useSpeechRecognition';

const FORMAT_OPTIONS: { value: ConversationFormat; label: string }[] = [
    { value: 'voice_chat', label: 'Voice Chat' },
    { value: 'debate', label: 'Debate' },
    { value: 'brainstorm', label: 'Brainstorm' },
    { value: 'deep_dive', label: 'Deep Dive' },
    { value: 'cross_exam', label: 'Cross-Exam' },
    { value: 'risk_review', label: 'Risk Review' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'reframe', label: 'Reframe' },
    { value: 'standup', label: 'Standup' },
    { value: 'checkin', label: 'Check-in' },
    { value: 'triage', label: 'Triage' },
    { value: 'planning', label: 'Planning' },
    { value: 'shipping', label: 'Shipping' },
    { value: 'retro', label: 'Retro' },
    { value: 'writing_room', label: 'Writing Room' },
    { value: 'content_review', label: 'Content Review' },
    { value: 'watercooler', label: 'Watercooler' },
];

const MAX_CHARS = 500;
const MIN_CHARS = 10;

type SubmitState = 'idle' | 'loading' | 'success' | 'error';

export interface VoiceSessionInfo {
    sessionId: string;
    topic: string;
    format: ConversationFormat;
}

export function AskTheRoom({
    onVoiceSessionCreated,
}: {
    onVoiceSessionCreated?: (info: VoiceSessionInfo) => void;
} = {}) {
    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [format, setFormat] = useState<ConversationFormat>('debate');
    const [submitState, setSubmitState] = useState<SubmitState>('idle');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [retryAfter, setRetryAfter] = useState(0);
    const [voiceMode, setVoiceMode] = useState(false);

    const [stt, sttControls] = useSpeechRecognition();

    // Populate textarea when speech recognition produces a final result
    const prevTranscript = useRef('');
    useEffect(() => {
        if (stt.transcript && stt.transcript !== prevTranscript.current) {
            prevTranscript.current = stt.transcript;
            // Speech recognition is an external browser source; sync final transcript into the editable field.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setQuestion(prev => {
                const joined = prev ? `${prev} ${stt.transcript}` : stt.transcript;
                return joined.slice(0, MAX_CHARS);
            });
        }
    }, [stt.transcript]);

    const charsRemaining = MAX_CHARS - question.length;
    const canSubmit =
        question.trim().length >= MIN_CHARS && submitState !== 'loading';

    // Auto-enable voice mode when voice_chat format is selected
    useEffect(() => {
        // Keep dependent voice-mode toggle synchronized with format picker.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (format === 'voice_chat') setVoiceMode(true);
    }, [format]);

    const handleSubmit = useCallback(async (isVoice = false) => {
        // voice_chat format always uses voice mode
        if (format === 'voice_chat') isVoice = true;

        if (question.trim().length < MIN_CHARS || submitState === 'loading')
            return;

        setSubmitState('loading');
        setErrorMessage('');
        setRetryAfter(0);

        const submittedQuestion = question.trim();
        const submittedFormat = format;

        try {
            const res = await fetch('/api/ops/roundtable/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: submittedQuestion,
                    format: submittedFormat,
                    ...(isVoice && { voiceMode: true }),
                }),
            });

            const data = await res.json();

            if (res.status === 429) {
                setSubmitState('error');
                setErrorMessage(data.error ?? 'Rate limited.');
                setRetryAfter(data.retryAfter ?? 60);
                return;
            }

            if (!res.ok) {
                setSubmitState('error');
                setErrorMessage(data.error ?? 'Something went wrong.');
                return;
            }

            setSubmitState('success');
            setSessionId(data.sessionId);
            setQuestion('');

            // In voice mode, notify parent to open live transcript with auto-speak
            if (isVoice && onVoiceSessionCreated) {
                onVoiceSessionCreated({
                    sessionId: data.sessionId,
                    topic: submittedQuestion,
                    format: submittedFormat,
                });
            }
        } catch {
            setSubmitState('error');
            setErrorMessage('Network error. Please try again.');
        }
    }, [question, format, submitState, onVoiceSessionCreated]);

    // Voice mode: auto-submit when STT produces a final transcript
    const autoSubmitRef = useRef(false);
    useEffect(() => {
        if (
            voiceMode &&
            stt.transcript &&
            stt.transcript === prevTranscript.current &&
            !stt.isListening &&
            !autoSubmitRef.current &&
            submitState !== 'loading' &&
            submitState !== 'success'
        ) {
            // Check the question length (which was updated by the transcript effect)
            const pendingQuestion = question.trim();
            if (pendingQuestion.length >= MIN_CHARS) {
                autoSubmitRef.current = true;
                // Submit in response to the external speech-recognition completion event.
                // eslint-disable-next-line react-hooks/set-state-in-effect
                handleSubmit(true);
            }
        }
        // Reset auto-submit flag when STT starts listening again
        if (stt.isListening) {
            autoSubmitRef.current = false;
        }
    }, [voiceMode, stt.transcript, stt.isListening, question, submitState, handleSubmit]);

    const handleReset = useCallback(() => {
        setSubmitState('idle');
        setSessionId(null);
        setErrorMessage('');
        setRetryAfter(0);
    }, []);

    // Countdown timer for retry-after
    const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (retryAfter <= 0) return;
        retryTimerRef.current = setInterval(() => {
            setRetryAfter(prev => {
                if (prev <= 1) {
                    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {
            if (retryTimerRef.current) clearInterval(retryTimerRef.current);
        };
    }, [retryAfter > 0]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden'>
            {/* Toggle header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label='Ask the collective a question'
                className='w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors'
            >
                <div className='flex items-center gap-2'>
                    <SubcorpAvatar size='lg' />
                    <span className='text-xs font-medium text-zinc-300'>
                        Ask the Collective
                    </span>
                    {stt.isSupported && (
                        <button
                            type='button'
                            onClick={e => {
                                e.stopPropagation();
                                setVoiceMode(v => !v);
                                if (!isOpen) setIsOpen(true);
                            }}
                            aria-label={voiceMode ? 'Disable voice mode' : 'Enable voice mode'}
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider border transition-colors ${
                                voiceMode
                                    ? 'bg-scan/15 border-scan/30 text-scan'
                                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-400'
                            }`}
                        >
                            <svg
                                className='h-2.5 w-2.5'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth={2}
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            >
                                <path d='M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z' />
                                <path d='M19 10v2a7 7 0 0 1-14 0v-2' />
                                <line x1='12' x2='12' y1='19' y2='22' />
                            </svg>
                            Voice
                        </button>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                >
                    <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                    />
                </svg>
            </button>

            {/* Collapsible body */}
            {isOpen && (
                <div className='px-4 pb-4 space-y-3 border-t border-zinc-800'>
                    {/* Success state (only shown for non-voice submissions — voice mode shows transcript instead) */}
                    {submitState === 'success' && sessionId && !voiceMode && (
                        <div className='pt-3 space-y-2'>
                            <div className='rounded-lg border border-green-800/50 bg-green-900/20 p-3'>
                                <p className='text-xs text-green-400 font-medium'>
                                    Question submitted! Session starting...
                                </p>
                                <p className='text-[10px] text-zinc-500 mt-1'>
                                    Session ID: {sessionId}
                                </p>
                            </div>
                            <button
                                onClick={handleReset}
                                className='text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors'
                            >
                                Ask another question
                            </button>
                        </div>
                    )}

                    {/* Input form — hidden on non-voice success (voice mode shows transcript via parent) */}
                    {(submitState !== 'success' || voiceMode) && (
                        <>
                            {/* Textarea */}
                            <div className='pt-3'>
                                <label htmlFor='ask-question' className='sr-only'>
                                    Your question for the collective
                                </label>
                                <textarea
                                    id='ask-question'
                                    value={question}
                                    onChange={e =>
                                        setQuestion(
                                            e.target.value.slice(0, MAX_CHARS),
                                        )
                                    }
                                    placeholder='Ask the collective a question...'
                                    disabled={submitState === 'loading'}
                                    rows={3}
                                    aria-describedby='char-count'
                                    className='w-full rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 resize-none disabled:opacity-50'
                                />
                                <div className='flex justify-end mt-1'>
                                    <span
                                        id='char-count'
                                        className={`text-[10px] ${charsRemaining < 50 ? 'text-amber-500' : 'text-zinc-600'}`}
                                    >
                                        {charsRemaining} remaining
                                    </span>
                                </div>
                            </div>

                            {/* Interim transcript hint */}
                            {stt.interimTranscript && (
                                <p className='text-[11px] text-zinc-500 italic -mt-1 px-1 truncate'>
                                    {stt.interimTranscript}
                                </p>
                            )}

                            {/* Format selector + mic + submit */}
                            <div className='flex items-center gap-2'>
                                <label htmlFor='format-select' className='sr-only'>
                                    Conversation format
                                </label>
                                <select
                                    id='format-select'
                                    value={format}
                                    onChange={e =>
                                        setFormat(
                                            e.target
                                                .value as ConversationFormat,
                                        )
                                    }
                                    disabled={submitState === 'loading'}
                                    className='flex-shrink-0 rounded-lg border border-zinc-700/50 bg-zinc-800 px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-zinc-600 disabled:opacity-50 cursor-pointer'
                                >
                                    {FORMAT_OPTIONS.map(opt => (
                                        <option
                                            key={opt.value}
                                            value={opt.value}
                                            className='bg-zinc-800 text-zinc-300'
                                        >
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>

                                <div className='flex-1' />

                                {/* Mic button — speech-to-text */}
                                {stt.isSupported && (
                                    <button
                                        type='button'
                                        onClick={() => {
                                            if (stt.isListening) {
                                                sttControls.stop();
                                            } else {
                                                sttControls.reset();
                                                sttControls.start();
                                            }
                                        }}
                                        disabled={submitState === 'loading'}
                                        aria-label={stt.isListening ? 'Stop listening' : 'Speak your question'}
                                        className={`relative rounded-lg border px-2.5 py-2.5 sm:py-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                            stt.isListening
                                                ? 'border-red-600/60 bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                                : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                        }`}
                                    >
                                        {/* Pulsing ring when listening */}
                                        {stt.isListening && (
                                            <span className='absolute inset-0 rounded-lg border-2 border-red-500/40 animate-ping pointer-events-none' />
                                        )}
                                        <svg
                                            className='h-3.5 w-3.5'
                                            viewBox='0 0 24 24'
                                            fill='none'
                                            stroke='currentColor'
                                            strokeWidth={2}
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        >
                                            <path d='M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z' />
                                            <path d='M19 10v2a7 7 0 0 1-14 0v-2' />
                                            <line x1='12' x2='12' y1='19' y2='22' />
                                        </svg>
                                    </button>
                                )}

                                <button
                                    onClick={() => handleSubmit(false)}
                                    disabled={!canSubmit}
                                    className='rounded-lg border border-green-700/50 bg-green-900/30 px-4 py-2.5 sm:py-1.5 text-[11px] font-medium text-green-400 hover:bg-green-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5'
                                >
                                    {submitState === 'loading' ?
                                        <>
                                            <svg
                                                className='animate-spin h-3 w-3'
                                                viewBox='0 0 24 24'
                                            >
                                                <circle
                                                    className='opacity-25'
                                                    cx='12'
                                                    cy='12'
                                                    r='10'
                                                    stroke='currentColor'
                                                    strokeWidth='4'
                                                    fill='none'
                                                />
                                                <path
                                                    className='opacity-75'
                                                    fill='currentColor'
                                                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                                                />
                                            </svg>
                                            Submitting...
                                        </>
                                    :   'Submit'}
                                </button>
                            </div>

                            {/* STT error */}
                            {stt.error && (
                                <p className='text-[10px] text-amber-400 px-1'>
                                    {stt.error}
                                </p>
                            )}

                            {/* Error state */}
                            {submitState === 'error' && (
                                <div
                                    role='alert'
                                    className='rounded-lg border border-red-800/50 bg-red-900/20 p-3'
                                >
                                    <p className='text-[11px] text-red-400'>
                                        {errorMessage}
                                    </p>
                                    {retryAfter > 0 && (
                                        <p className='text-[10px] text-zinc-500 mt-1'>
                                            Retry in {retryAfter}s
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
