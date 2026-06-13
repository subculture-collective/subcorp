'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useAuthModal } from '@/lib/auth/client';

type ModalState = 'choose' | 'login' | 'signup';

export function AuthModal() {
    const { request, clearRequest } = useAuthModal();
    const { login, signup } = useAuth();

    const [state, setState] = useState<ModalState>('choose');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (request) {
            setState('choose');
            setEmail('');
            setUsername('');
            setPassword('');
            setError('');
            setSubmitting(false);
        }
    }, [request]);

    // Close on Escape
    useEffect(() => {
        if (!request) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') clearRequest();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [request, clearRequest]);

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(email, password);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }, [email, password, login]);

    const handleSignup = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await signup(email, username, password);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }, [email, username, password, signup]);

    if (!request) return null;

    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm'
            onClick={(e) => {
                if (e.target === e.currentTarget) clearRequest();
            }}
        >
            <div className='w-full max-w-sm rounded-xl bg-zinc-900 border border-zinc-700/50 shadow-2xl'>
                <div className='p-6 space-y-4'>
                    {/* Header */}
                    <div className='text-center space-y-1'>
                        <h2 className='text-lg font-semibold text-zinc-100'>
                            {state === 'choose' && 'Sign in to continue'}
                            {state === 'login' && 'Log In'}
                            {state === 'signup' && 'Create Account'}
                        </h2>
                        {request.reason && state === 'choose' && (
                            <p className='text-xs text-zinc-400'>{request.reason}</p>
                        )}
                    </div>

                    {/* Choose state */}
                    {state === 'choose' && (
                        <div className='space-y-3'>
                            {/* OAuth providers */}
                            <Link
                                href='/api/auth/oauth/github'
                                className='w-full rounded-lg bg-[#24292f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2f363d] transition-colors flex items-center justify-center gap-2'
                            >
                                <svg className='w-4 h-4' viewBox='0 0 16 16' fill='currentColor'><path d='M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z'/></svg>
                                Continue with GitHub
                            </Link>
                            <Link
                                href='/api/auth/oauth/discord'
                                className='w-full rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#4752c4] transition-colors flex items-center justify-center gap-2'
                            >
                                <svg className='w-4 h-4' viewBox='0 0 16 16' fill='currentColor'><path d='M13.55 3.15A13.2 13.2 0 0010.3 2a9.5 9.5 0 00-.42.86 12.3 12.3 0 00-3.76 0A9.3 9.3 0 005.7 2a13.3 13.3 0 00-3.26 1.16C.36 6.77-.22 10.3.07 13.79A13.4 13.4 0 004.12 16a10 10 0 00.87-1.41 8.6 8.6 0 01-1.37-.66l.33-.26a9.5 9.5 0 008.1 0l.33.26c-.44.26-.9.48-1.37.66.25.5.54.97.87 1.41a13.4 13.4 0 004.05-2.21c.39-4.08-.66-7.57-2.78-10.64zM5.35 11.65c-.92 0-1.68-.84-1.68-1.88s.74-1.88 1.68-1.88 1.69.85 1.68 1.88c0 1.04-.74 1.88-1.68 1.88zm6.3 0c-.92 0-1.68-.84-1.68-1.88s.74-1.88 1.68-1.88 1.69.85 1.68 1.88c0 1.04-.74 1.88-1.68 1.88z'/></svg>
                                Continue with Discord
                            </Link>
                            <Link
                                href='/api/auth/oauth/openai'
                                className='w-full rounded-lg bg-[#10a37f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0d8c6d] transition-colors flex items-center justify-center gap-2'
                            >
                                <svg className='w-4 h-4' viewBox='0 0 24 24' fill='currentColor'><path d='M22.28 9.37a6.04 6.04 0 00-.52-4.93 6.1 6.1 0 00-6.58-2.83A6.04 6.04 0 0010.68 0a6.1 6.1 0 00-5.83 4.25 6.04 6.04 0 00-4.03 2.92 6.1 6.1 0 00.75 7.14 6.04 6.04 0 00.52 4.93 6.1 6.1 0 006.58 2.83A6.04 6.04 0 0013.17 24a6.1 6.1 0 005.83-4.25 6.04 6.04 0 004.03-2.92 6.1 6.1 0 00-.75-7.14v-.32zM13.17 22.7a4.57 4.57 0 01-2.94-1.07l.15-.08 4.88-2.82a.8.8 0 00.4-.69v-6.9l2.06 1.19a.07.07 0 01.04.06v5.7a4.59 4.59 0 01-4.59 4.6zM3.6 18.53a4.56 4.56 0 01-.55-3.07l.15.09 4.88 2.82a.78.78 0 00.78 0l5.96-3.44v2.38a.08.08 0 01-.03.06l-4.94 2.85a4.59 4.59 0 01-6.26-1.69zM2.34 7.9A4.56 4.56 0 014.73 5.9v5.8a.78.78 0 00.39.68l5.96 3.44-2.07 1.19a.08.08 0 01-.07 0L4 14.17a4.59 4.59 0 01-1.66-6.27zm17.05 3.97l-5.96-3.44 2.07-1.2a.07.07 0 01.07 0l4.94 2.86a4.59 4.59 0 01-.71 8.28v-5.81a.79.79 0 00-.4-.69zm2.05-3.1l-.15-.09-4.88-2.82a.78.78 0 00-.78 0L9.67 9.3V6.92a.07.07 0 01.03-.06l4.94-2.85a4.59 4.59 0 016.8 4.76zM8.53 12.7l-2.07-1.2a.07.07 0 01-.04-.05V5.76a4.59 4.59 0 017.53-3.53l-.15.08-4.88 2.82a.8.8 0 00-.4.69l.01 6.88zm1.12-2.42l2.65-1.53 2.65 1.53v3.06l-2.65 1.53-2.65-1.53v-3.06z'/></svg>
                                Continue with OpenAI
                            </Link>
                            <div className='flex items-center gap-3 py-1'>
                                <div className='flex-1 h-px bg-zinc-700/50' />
                                <span className='text-[10px] text-zinc-500 uppercase tracking-wider'>or</span>
                                <div className='flex-1 h-px bg-zinc-700/50' />
                            </div>

                            <button
                                onClick={() => setState('login')}
                                className='w-full rounded-lg bg-zinc-800 border border-zinc-700/50 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer'
                            >
                                Log in with email
                            </button>
                            <button
                                onClick={() => setState('signup')}
                                className='w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer py-1'
                            >
                                Create account with email
                            </button>
                        </div>
                    )}

                    {/* Login form */}
                    {state === 'login' && (
                        <form onSubmit={handleLogin} className='space-y-3'>
                            <input
                                type='email'
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder='Email'
                                autoFocus
                                required
                                className='w-full rounded-lg bg-zinc-800 border border-zinc-700/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors'
                            />
                            <input
                                type='password'
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder='Password'
                                required
                                minLength={8}
                                className='w-full rounded-lg bg-zinc-800 border border-zinc-700/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors'
                            />
                            {error && (
                                <p className='text-xs text-rose-400 text-center'>{error}</p>
                            )}
                            <button
                                type='submit'
                                disabled={submitting}
                                className='w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 cursor-pointer'
                            >
                                {submitting ? 'Logging in...' : 'Log In'}
                            </button>
                            <button
                                type='button'
                                onClick={() => { setState('choose'); setError(''); }}
                                className='w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer'
                            >
                                Back
                            </button>
                        </form>
                    )}

                    {/* Signup form */}
                    {state === 'signup' && (
                        <form onSubmit={handleSignup} className='space-y-3'>
                            <input
                                type='email'
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder='Email'
                                autoFocus
                                required
                                className='w-full rounded-lg bg-zinc-800 border border-zinc-700/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors'
                            />
                            <input
                                type='text'
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder='Username'
                                required
                                minLength={3}
                                maxLength={30}
                                pattern='[a-zA-Z0-9_]+'
                                className='w-full rounded-lg bg-zinc-800 border border-zinc-700/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors'
                            />
                            <input
                                type='password'
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder='Password (8+ characters)'
                                required
                                minLength={8}
                                className='w-full rounded-lg bg-zinc-800 border border-zinc-700/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors'
                            />
                            {error && (
                                <p className='text-xs text-rose-400 text-center'>{error}</p>
                            )}
                            <button
                                type='submit'
                                disabled={submitting}
                                className='w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50 cursor-pointer'
                            >
                                {submitting ? 'Creating account...' : 'Create Account'}
                            </button>
                            <button
                                type='button'
                                onClick={() => { setState('choose'); setError(''); }}
                                className='w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer'
                            >
                                Back
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
