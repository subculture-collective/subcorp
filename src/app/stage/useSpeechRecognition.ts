// useSpeechRecognition — browser Web Speech API wrapper
// Single-utterance mode: user clicks mic, speaks, transcript populates
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Web Speech API type shims (not in TS default DOM lib) ───

interface SpeechRecognitionResultItem {
    transcript: string;
    confidence: number;
}

interface SpeechRecognitionResult {
    readonly length: number;
    readonly isFinal: boolean;
    [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventShim extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventShim extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEventShim) => void) | null;
    onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEventShim) => void) | null;
    onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionWindow extends Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
}

// Browser compat — SpeechRecognition is prefixed in most engines
function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const speechWindow = window as SpeechRecognitionWindow;
    return (
        speechWindow.SpeechRecognition ??
        speechWindow.webkitSpeechRecognition ??
        null
    );
}

export interface SpeechRecognitionState {
    /** Whether the mic is actively listening */
    isListening: boolean;
    /** Whether the browser supports Speech Recognition */
    isSupported: boolean;
    /** Latest transcribed text (final result) */
    transcript: string;
    /** Interim (in-progress) transcript while speaking */
    interimTranscript: string;
    /** Error message if recognition failed */
    error: string | null;
}

export interface SpeechRecognitionControls {
    /** Start listening for speech */
    start: () => void;
    /** Stop listening */
    stop: () => void;
    /** Clear the transcript and error */
    reset: () => void;
}

export function useSpeechRecognition(): [SpeechRecognitionState, SpeechRecognitionControls] {
    const [isListening, setIsListening] = useState(false);
    const [isSupported] = useState(() => getSpeechRecognitionCtor() !== null);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    const start = useCallback(() => {
        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) {
            setError('Speech recognition not supported in this browser');
            return;
        }

        // Abort any existing instance
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }

        setError(null);
        setInterimTranscript('');

        const recognition = new Ctor();
        recognition.lang = 'en-US';
        recognition.continuous = false;       // single utterance
        recognition.interimResults = true;    // show partial results
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEventShim) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            if (final) {
                setTranscript(final.trim());
                setInterimTranscript('');
            } else {
                setInterimTranscript(interim);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEventShim) => {
            setIsListening(false);

            switch (event.error) {
                case 'not-allowed':
                    setError('Microphone access denied. Check browser permissions.');
                    break;
                case 'no-speech':
                    // Not an error — user just didn't speak. Silently stop.
                    break;
                case 'network':
                    setError('Network error during speech recognition.');
                    break;
                case 'aborted':
                    // Manual abort — not an error
                    break;
                default:
                    setError(`Speech recognition error: ${event.error}`);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimTranscript('');
            recognitionRef.current = null;
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, []);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    const reset = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
        setError(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    return [
        { isListening, isSupported, transcript, interimTranscript, error },
        { start, stop, reset },
    ];
}
