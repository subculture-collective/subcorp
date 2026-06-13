'use client';

import Markdown from 'react-markdown';

/**
 * Shared markdown renderer for agent-generated content.
 * Uses react-markdown + tailwind prose for consistent rendering.
 * NOT for the FileBrowser (which has its own renderer for workspace files).
 */
export function MarkdownContent({
    children,
    className = '',
}: {
    children: string;
    className?: string;
}) {
    return (
        <div
            className={`prose prose-invert prose-sm max-w-none
                prose-p:my-1 prose-p:leading-relaxed
                prose-headings:mt-3 prose-headings:mb-1 prose-headings:text-zinc-200
                prose-strong:text-zinc-200
                prose-ul:my-1 prose-ol:my-1
                prose-li:my-0
                prose-code:text-zinc-300 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-zinc-800/80 prose-pre:border prose-pre:border-zinc-700/50
                prose-a:text-accent-blue prose-a:no-underline hover:prose-a:underline
                prose-hr:border-zinc-700/50
                prose-blockquote:border-zinc-600 prose-blockquote:text-zinc-400
                ${className}`}
        >
            <Markdown>{children}</Markdown>
        </div>
    );
}
