import { PlaybookCard, JsonLd } from './components';
import { glossary } from '@/data/learn/glossary';
import { comparisons } from '@/data/learn/comparisons';
import { directory } from '@/data/learn/directory';
import { alternatives } from '@/data/learn/alternatives';

const BASE = 'https://subcorp.subcult.tv';

export default function LearnHub() {
    return (
        <>
            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: 'AI Agent Systems — Learn',
                    description:
                        'Guides, comparisons, and a curated directory of tools for building AI agent systems.',
                    url: `${BASE}/learn`,
                    isPartOf: {
                        '@type': 'WebSite',
                        name: 'SUBCORP',
                        url: BASE,
                    },
                }}
            />

            <h1 className='text-3xl font-bold tracking-tight mb-2'>
                AI Agent Systems
            </h1>
            <p className='text-sm text-zinc-400 mb-10 max-w-xl'>
                Guides, comparisons, and a curated directory of tools for
                building AI agent systems.
            </p>

            <div className='grid gap-4 sm:grid-cols-2'>
                <PlaybookCard
                    href='/learn/glossary'
                    title='Glossary'
                    description='Key terms and concepts in autonomous AI — from agent chaining to tool use.'
                    count={glossary.length}
                    countLabel='terms'
                />
                <PlaybookCard
                    href='/learn/compare'
                    title='Comparisons'
                    description='Side-by-side breakdowns of frameworks, models, and architectural patterns.'
                    count={comparisons.length}
                    countLabel='comparisons'
                />
                <PlaybookCard
                    href='/learn/directory'
                    title='Directory'
                    description='Curated tools, frameworks, and platforms for building agent systems.'
                    count={directory.length}
                    countLabel='entries'
                />
                <PlaybookCard
                    href='/learn/alternatives'
                    title='Alternatives'
                    description='Find alternatives to popular AI agent tools — OpenClaw, ClawHub, LangChain, and more.'
                    count={alternatives.length}
                    countLabel='tools compared'
                />
            </div>
        </>
    );
}
