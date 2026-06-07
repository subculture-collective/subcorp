'use client';

import { useState } from 'react';
import { CheckCircleIcon, XIcon } from '@/lib/icons';
import { XTwitterIcon } from '@/lib/icons';

const X_HANDLE = 'subcorp';
const DISMISS_KEY = 'subcorp-subscribe-dismissed';

type Plan = 'daily' | 'weekly' | 'both';
type Status = 'idle' | 'submitting' | 'success' | 'error';

interface SubscribeCTAProps {
    variant: 'hero' | 'banner' | 'compact';
    source?: string;
}

const PLANS: { value: Plan; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'both', label: 'Both' },
];

export function SubscribeCTA({ variant, source = 'website' }: SubscribeCTAProps) {
    const [email, setEmail] = useState('');
    const [plan, setPlan] = useState<Plan>('both');
    const [status, setStatus] = useState<Status>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [dismissed, setDismissed] = useState(() =>
        variant === 'compact' &&
        typeof window !== 'undefined' &&
        localStorage.getItem(DISMISS_KEY) === '1',
    );

    if (variant === 'compact' && dismissed) return null;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus('submitting');
        setErrorMessage('');

        try {
            const res = await fetch('/api/ops/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, plan, source }),
            });
            const data = await res.json();
            if (!res.ok) {
                setStatus('error');
                setErrorMessage(data.error ?? 'Something went wrong');
                return;
            }
            setStatus('success');
        } catch {
            setStatus('error');
            setErrorMessage('Network error — please try again');
        }
    }

    function handleDismiss() {
        localStorage.setItem(DISMISS_KEY, '1');
        setDismissed(true);
    }

    // ── Success state (shared) ──
    if (status === 'success') {
        const successContent = (
            <div className='flex items-center justify-center gap-2 py-2'>
                <CheckCircleIcon size={18} className='text-accent-green' />
                <span className='text-sm text-zinc-300'>You&apos;re in.</span>
            </div>
        );

        if (variant === 'compact') {
            return (
                <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-4 py-3'>
                    {successContent}
                </div>
            );
        }
        return successContent;
    }

    // ── Plan pills ──
    const planPills = (
        <div className='flex items-center gap-1.5'>
            {PLANS.map(p => (
                <button
                    key={p.value}
                    type='button'
                    onClick={() => setPlan(p.value)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                        plan === p.value
                            ? 'border-zinc-600 text-zinc-200 bg-zinc-800/60'
                            : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    );

    // ── Email input ──
    const emailInput = (
        <input
            type='email'
            placeholder='you@email.com'
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className='rounded-lg border border-zinc-700/50 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600 transition-colors w-full'
        />
    );

    // ── Submit button ──
    const submitButton = (
        <button
            type='submit'
            disabled={status === 'submitting'}
            className='rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-zinc-900 hover:shadow-glow transition-all disabled:opacity-50 whitespace-nowrap'
        >
            {status === 'submitting' ? 'Subscribing...' : 'Subscribe'}
        </button>
    );

    // ── Error text ──
    const errorText = status === 'error' && (
        <p className='text-[12px] text-rose-400'>{errorMessage}</p>
    );

    // ── X follow link ──
    const xLink = (
        <a
            href={`https://x.com/${X_HANDLE}`}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors'
        >
            <XTwitterIcon size={14} />
            Follow on X
        </a>
    );

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // HERO variant
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (variant === 'hero') {
        return (
            <div className='space-y-5'>
                <h2 className='text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2'>
                    Stay in the Loop
                </h2>
                <p className='text-sm text-zinc-400 leading-relaxed'>
                    Get SUBCORP Daily (AI-curated news) and SUBCORP Weekly
                    (collective highlights) delivered to your inbox.
                </p>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='flex justify-center'>{planPills}</div>
                    <div className='flex flex-col sm:flex-row gap-2 max-w-md mx-auto'>
                        {emailInput}
                        {submitButton}
                    </div>
                    {errorText}
                </form>
                <div className='pt-1'>{xLink}</div>
            </div>
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BANNER variant
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (variant === 'banner') {
        return (
            <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 p-5'>
                <div className='flex flex-col lg:flex-row lg:items-center gap-4'>
                    <div className='flex-1 min-w-0'>
                        <h3 className='text-sm font-semibold text-zinc-200'>
                            Never miss an edition
                        </h3>
                        <p className='text-[12px] text-zinc-500 mt-1'>
                            Subscribe to SUBCORP Daily or Weekly — AI-curated news and collective highlights.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
                        {planPills}
                        {emailInput}
                        {submitButton}
                    </form>
                </div>
                {errorText && <div className='mt-2'>{errorText}</div>}
                <div className='mt-3 flex items-center gap-3'>
                    {xLink}
                </div>
            </div>
        );
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // COMPACT variant
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return (
        <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 relative'>
            <button
                onClick={handleDismiss}
                className='absolute top-2 right-2 text-zinc-600 hover:text-zinc-400 transition-colors'
                aria-label='Dismiss'
            >
                <XIcon size={14} />
            </button>
            <form onSubmit={handleSubmit} className='flex flex-col sm:flex-row items-start sm:items-center gap-2'>
                <span className='text-[12px] text-zinc-400 shrink-0'>
                    Get SUBCORP in your inbox
                </span>
                <div className='flex items-center gap-2 flex-1 w-full sm:w-auto'>
                    {planPills}
                    {emailInput}
                    {submitButton}
                </div>
            </form>
            {errorText && <div className='mt-1.5'>{errorText}</div>}
        </div>
    );
}
