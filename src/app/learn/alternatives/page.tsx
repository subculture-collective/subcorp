import type { Metadata } from 'next';
import Link from 'next/link';
import { alternatives } from '@/data/learn/alternatives';
import { ItemListJsonLd } from '../components';

const BASE = 'https://subcorp.subcult.tv';

export const metadata: Metadata = {
    title: 'AI Agent Tool Alternatives',
    description:
        'Compare alternatives to popular AI agent tools — OpenClaw, ClawHub, LangChain, CrewAI, AutoGen, and more. Find the right framework for your multi-agent system.',
};

export default function AlternativesIndex() {
    return (
        <>
            <ItemListJsonLd
                name='AI Agent Tool Alternatives'
                items={alternatives.map(e => ({
                    url: `${BASE}/learn/alternatives/${e.slug}`,
                    name: `${e.name} Alternatives`,
                }))}
            />

            <h1 className='text-2xl font-bold tracking-tight mb-2'>
                AI Agent Tool Alternatives
            </h1>
            <p className='text-sm text-zinc-400 mb-8 max-w-xl'>
                Compare alternatives to popular AI agent frameworks, gateways,
                and tool registries. Find the right tools for building
                autonomous multi-agent systems.
            </p>

            <div className='space-y-3'>
                {alternatives.map(entry => (
                    <Link
                        key={entry.slug}
                        href={`/learn/alternatives/${entry.slug}`}
                        className='block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors group'
                    >
                        <div className='flex items-center justify-between'>
                            <h2 className='text-base font-semibold text-zinc-200 group-hover:text-white transition-colors'>
                                {entry.name} Alternatives
                            </h2>
                            <span className='text-[10px] text-zinc-600'>
                                {entry.alternatives.length} alternatives
                            </span>
                        </div>
                        <p className='text-sm text-zinc-400 mt-1.5 line-clamp-2'>
                            {entry.shortDesc}
                        </p>
                    </Link>
                ))}
            </div>
        </>
    );
}
