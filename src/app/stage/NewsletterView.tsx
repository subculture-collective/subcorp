// NewsletterView — browse and view SUBCORP Weekly newsletter editions with PDF viewer
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MailIcon, ChevronDownIcon, DownloadIcon } from '@/lib/icons';

interface EditionEntry {
    id: string;
    edition_week: string;
    edition_date: string;
    headline: string;
    summary: string | null;
    spotlight_agent: string | null;
    has_pdf: boolean;
    created_at: string;
}

function formatWeek(week: string): string {
    return week; // e.g. "2026-W08"
}

export function NewsletterView() {
    const [editions, setEditions] = useState<EditionEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

    const fetchEditions = useCallback(async () => {
        try {
            const res = await fetch('/api/ops/newsletter?limit=30');
            if (!res.ok) return;
            const data = await res.json();
            setEditions(data.editions ?? []);
            // Auto-select the latest edition with a PDF
            if (!selectedWeek && data.editions?.length > 0) {
                const withPdf = data.editions.find((e: EditionEntry) => e.has_pdf);
                if (withPdf) {
                    setSelectedWeek(withPdf.edition_week);
                }
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [selectedWeek]);

    useEffect(() => {
        fetchEditions();
    }, [fetchEditions]);

    const selected = editions.find((e) => e.edition_week === selectedWeek);
    const pdfUrl = selectedWeek
        ? `/api/ops/newsletter/${selectedWeek}/pdf`
        : null;

    if (loading) {
        return (
            <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-6 animate-pulse'>
                <div className='h-5 w-48 rounded bg-zinc-700 mb-4' />
                <div className='h-[500px] rounded bg-zinc-800' />
            </div>
        );
    }

    if (editions.length === 0) {
        return (
            <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-8 text-center'>
                <MailIcon size={32} className='mx-auto text-zinc-600 mb-3' />
                <p className='text-sm text-zinc-500'>
                    No newsletter editions yet. The first issue generates on
                    Monday mornings.
                </p>
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            {/* Edition picker */}
            <div className='flex items-center gap-3 flex-wrap'>
                <div className='flex items-center gap-2'>
                    <MailIcon size={18} className='text-zinc-400' />
                    <span className='text-sm font-medium text-zinc-200'>
                        SUBCORP Weekly
                    </span>
                </div>

                <div className='relative'>
                    <select
                        value={selectedWeek ?? ''}
                        onChange={(e) =>
                            setSelectedWeek(e.target.value || null)
                        }
                        className='appearance-none bg-zinc-800/80 border border-zinc-700/50 rounded-lg px-3 py-1.5 pr-8 text-xs text-zinc-300 cursor-pointer focus:outline-none focus:border-zinc-600'
                    >
                        <option value=''>Select edition...</option>
                        {editions.map((e) => (
                            <option key={e.id} value={e.edition_week}>
                                {formatWeek(e.edition_week)} —{' '}
                                {e.headline.slice(0, 60)}
                                {!e.has_pdf ? ' (no PDF)' : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDownIcon
                        size={14}
                        className='absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none'
                    />
                </div>

                {pdfUrl && selected?.has_pdf && (
                    <a
                        href={pdfUrl}
                        download={`subcorp-weekly-${selectedWeek}.pdf`}
                        className='flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 border border-zinc-800 rounded-lg'
                    >
                        <DownloadIcon size={12} />
                        Download
                    </a>
                )}
            </div>

            {/* Selected edition info */}
            {selected && (
                <div className='px-1'>
                    <h2 className='text-lg font-semibold text-zinc-200'>
                        {selected.headline}
                    </h2>
                    <p className='text-xs text-zinc-500 mt-1'>
                        {formatWeek(selected.edition_week)}
                        {selected.spotlight_agent &&
                            ` · Spotlight: ${selected.spotlight_agent}`}
                    </p>
                </div>
            )}

            {/* PDF viewer */}
            {pdfUrl && selected?.has_pdf ? (
                <div className='rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900'>
                    <object
                        data={pdfUrl}
                        type='application/pdf'
                        className='w-full'
                        style={{
                            height: 'calc(100vh - 300px)',
                            minHeight: '500px',
                        }}
                    >
                        <div className='flex flex-col items-center justify-center py-16 text-zinc-500'>
                            <p className='mb-4 text-sm'>
                                Your browser cannot display PDFs inline.
                            </p>
                            <a
                                href={pdfUrl}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-xs text-zinc-300 hover:text-white px-4 py-2 border border-zinc-700 rounded-lg transition-colors'
                            >
                                Open PDF in new tab
                            </a>
                        </div>
                    </object>
                </div>
            ) : selected && !selected.has_pdf ? (
                <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/50 p-8 text-center'>
                    <p className='text-sm text-zinc-500'>
                        No PDF available for this edition.
                    </p>
                </div>
            ) : null}
        </div>
    );
}
