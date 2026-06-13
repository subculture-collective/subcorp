// VoiceChatInput — push-to-talk + text input for voice_chat sessions
// Sends user replies to the reply injection endpoint
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';

interface VoiceChatInputProps {
    sessionId: string;
    disabled?: boolean;
}

export function VoiceChatInput({ sessionId, disabled }: VoiceChatInputProps) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [stt, sttControls] = useSpeechRecognition();
    const inputRef = useRef<HTMLInputElement>(null);

    // Populate input when speech recognition produces a final result
    const prevTranscript = useRef('');
    useEffect(() => {
        if (stt.transcript && stt.transcript !== prevTranscript.current) {
            prevTranscript.current = stt.transcript;
            setMessage(stt.transcript);
        }
    }, [stt.transcript]);

    // Auto-send when STT finishes (continuous voice chat flow)
    const autoSendRef = useRef(false);
    useEffect(() => {
        if (
            stt.transcript &&
            stt.transcript === prevTranscript.current &&
            !stt.isListening &&
            !autoSendRef.current &&
            !sending &&
            message.trim().length > 0
        ) {
            autoSendRef.current = true;
            sendReply(message.trim());
        }
        if (stt.isListening) {
            autoSendRef.current = false;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stt.transcript, stt.isListening, sending, message]);

    const sendReply = useCallback(async (text: string) => {
        if (!text || sending) return;

        setSending(true);
        setError(null);

        try {
            const res = await fetch(`/api/ops/roundtable/${sessionId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error ?? `Error ${res.status}`);
            } else {
                setMessage('');
                prevTranscript.current = '';
                sttControls.reset();
                // Refocus input for next message
                inputRef.current?.focus();
            }
        } catch {
            setError('Network error');
        } finally {
            setSending(false);
        }
    }, [sessionId, sending, sttControls]);

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const text = message.trim();
        if (text) sendReply(text);
    }, [message, sendReply]);

    const isDisabled = disabled || sending;

    return (
        <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2'>
            <form onSubmit={handleSubmit} className='flex items-center gap-2'>
                {/* Mic button */}
                {stt.isSupported && (
                    <button
                        type='button'
                        onClick={() => {
                            if (stt.isListening) {
                                sttControls.stop();
                            } else {
                                sttControls.reset();
                                setMessage('');
                                sttControls.start();
                            }
                        }}
                        disabled={isDisabled}
                        aria-label={stt.isListening ? 'Stop listening' : 'Speak your reply'}
                        className={`relative shrink-0 rounded-lg border p-2 transition-colors disabled:opacity-40 ${
                            stt.isListening
                                ? 'border-red-600/60 bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                    >
                        {stt.isListening && (
                            <span className='absolute inset-0 rounded-lg border-2 border-red-500/40 animate-ping pointer-events-none' />
                        )}
                        <svg
                            className='h-4 w-4'
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

                {/* Text input */}
                <input
                    ref={inputRef}
                    type='text'
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={stt.isListening ? 'Listening...' : 'Type a reply...'}
                    disabled={isDisabled}
                    maxLength={1000}
                    className='flex-1 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 disabled:opacity-50'
                />

                {/* Send button */}
                <button
                    type='submit'
                    disabled={isDisabled || !message.trim()}
                    className='shrink-0 rounded-lg border border-scan/50 bg-scan/10 px-3 py-2 text-xs font-medium text-scan hover:bg-scan/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                >
                    {sending ? (
                        <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
                            <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                            <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                        </svg>
                    ) : (
                        <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2}>
                            <path strokeLinecap='round' strokeLinejoin='round' d='M5 12h14M12 5l7 7-7 7' />
                        </svg>
                    )}
                </button>
            </form>

            {/* Interim transcript */}
            {stt.interimTranscript && (
                <p className='text-[11px] text-zinc-500 italic px-1 truncate'>
                    {stt.interimTranscript}
                </p>
            )}

            {/* Errors */}
            {(error || stt.error) && (
                <p className='text-[10px] text-amber-400 px-1'>
                    {error || stt.error}
                </p>
            )}
        </div>
    );
}
