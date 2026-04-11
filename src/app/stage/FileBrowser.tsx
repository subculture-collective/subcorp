// FileBrowser — workspace filesystem browser + content pipeline sub-tabs
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
    useWorkspaceDirectory,
    useWorkspaceFile,
    type WorkspaceEntry,
} from './hooks';
import { ContentPipeline } from './ContentPipeline';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';
import {
    FolderIcon,
    FileTextIcon,
    DownloadIcon,
    ChevronRightIcon,
    RefreshIcon,
} from '@/lib/icons';

// ─── Sub-tab toggle ───

type SubTab = 'workspace' | 'content';

// ─── Helpers ───

function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

function formatDate(epoch: number): string {
    if (!epoch) return '';
    const d = new Date(epoch * 1000);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getFileExtension(name: string): string {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

function isCodeFile(ext: string): boolean {
    return ['json', 'ts', 'js', 'tsx', 'jsx', 'sql', 'sh', 'yaml', 'yml', 'toml', 'py', 'css'].includes(ext);
}

const AGENT_IDS = Object.keys(AGENTS) as AgentId[];

function getAgentColor(name: string): string | null {
    const lower = name.toLowerCase();
    const agent = AGENT_IDS.find(id => id === lower);
    return agent ? AGENTS[agent].color : null;
}

// ─── Simple markdown renderer (no deps) ───

function renderMarkdown(text: string): string {
    const html = text
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-zinc-200 mt-4 mb-1">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold text-zinc-100 mt-5 mb-2">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-zinc-100 mt-6 mb-2">$1</h1>')
        // Bold & italic
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs">$1</code>')
        // Unordered lists
        .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-zinc-400">$1</li>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr class="border-zinc-700/50 my-3" />')
        // Line breaks (preserve paragraphs)
        .replace(/\n\n/g, '</p><p class="mb-2">')
        .replace(/\n/g, '<br />');

    return `<p class="mb-2">${html}</p>`;
}

// ─── Breadcrumb ───

function Breadcrumb({
    path,
    onNavigate,
    onRefresh,
}: {
    path: string;
    onNavigate: (p: string) => void;
    onRefresh: () => void;
}) {
    const segments = path.split('/').filter(Boolean);

    return (
        <div className='flex items-center gap-1 text-xs text-zinc-500 overflow-x-auto min-h-[28px]'>
            <button
                onClick={() => onNavigate('/')}
                className='hover:text-zinc-300 transition-colors px-1 cursor-pointer'
            >
                /workspace
            </button>
            {segments.map((seg, i) => {
                const target = '/' + segments.slice(0, i + 1).join('/');
                return (
                    <span key={target} className='flex items-center gap-1'>
                        <ChevronRightIcon size={10} className='text-zinc-600' />
                        <button
                            onClick={() => onNavigate(target)}
                            className='hover:text-zinc-300 transition-colors px-0.5 cursor-pointer'
                        >
                            {seg}
                        </button>
                    </span>
                );
            })}
            <button
                onClick={onRefresh}
                className='ml-auto p-1 hover:text-zinc-300 transition-colors cursor-pointer'
                title='Refresh'
            >
                <RefreshIcon size={12} />
            </button>
        </div>
    );
}

// ─── Directory listing ───

function DirectoryListing({
    entries,
    currentPath,
    onNavigate,
    onSelectFile,
    selectedFile,
}: {
    entries: WorkspaceEntry[];
    currentPath: string;
    onNavigate: (p: string) => void;
    onSelectFile: (p: string) => void;
    selectedFile: string | null;
}) {
    return (
        <div className='divide-y divide-zinc-800/50'>
            {entries.length === 0 && (
                <div className='py-8 text-center text-sm text-zinc-600'>
                    Empty directory
                </div>
            )}
            {entries.map(entry => {
                const entryPath = currentPath === '/'
                    ? `/${entry.name}`
                    : `${currentPath}/${entry.name}`;
                const isDir = entry.type === 'dir';
                const isSelected = !isDir && entryPath === selectedFile;

                // Agent-colored folder icon
                const agentColor = isDir && currentPath === '/agents'
                    ? getAgentColor(entry.name)
                    : null;

                return (
                    <button
                        key={entry.name}
                        onClick={() => isDir ? onNavigate(entryPath) : onSelectFile(entryPath)}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                            isSelected
                                ? 'bg-zinc-700/50 text-zinc-100'
                                : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                        }`}
                    >
                        {isDir ? (
                            <FolderIcon
                                size={14}
                                className='shrink-0'
                                style={agentColor ? { color: agentColor } : undefined}
                            />
                        ) : (
                            <FileTextIcon size={14} className='shrink-0 text-zinc-600' />
                        )}
                        <span className='flex-1 truncate'>{entry.name}</span>
                        {!isDir && (
                            <span className='text-[10px] text-zinc-600 tabular-nums'>
                                {formatSize(entry.size)}
                            </span>
                        )}
                        <span className='text-[10px] text-zinc-600 w-14 text-right'>
                            {formatDate(entry.modified)}
                        </span>
                        {isDir && (
                            <ChevronRightIcon size={12} className='text-zinc-600' />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── File preview ───

function FilePreview({ filePath }: { filePath: string }) {
    const { file, loading, error } = useWorkspaceFile(filePath);
    const ext = getFileExtension(filePath);
    const fileName = filePath.split('/').pop() ?? filePath;

    const handleDownload = useCallback(() => {
        if (!file) return;
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }, [file, fileName]);

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='text-sm text-zinc-600 animate-pulse'>Loading file...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className='rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400'>
                {error}
            </div>
        );
    }

    if (!file) return null;

    return (
        <div className='space-y-2'>
            <div className='flex items-center justify-between'>
                <span className='text-xs text-zinc-500 truncate'>
                    {filePath} ({formatSize(file.size)})
                </span>
                <button
                    onClick={handleDownload}
                    className='flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded border border-zinc-700/50 hover:border-zinc-600 cursor-pointer'
                >
                    <DownloadIcon size={10} />
                    Download
                </button>
            </div>
            <div className='rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-auto max-h-[60vh]'>
                {ext === 'md' ? (
                    <div
                        className='prose prose-invert prose-sm max-w-none p-4 text-zinc-400 text-sm leading-relaxed'
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(file.content) }}
                    />
                ) : isCodeFile(ext) ? (
                    <pre className='p-4 text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap break-words'>
                        {file.content}
                    </pre>
                ) : (
                    <pre className='p-4 text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap break-words'>
                        {file.content}
                    </pre>
                )}
            </div>
        </div>
    );
}

// ─── Main component ───

export function FileBrowser() {
    const [subTab, setSubTab] = useState<SubTab>('workspace');
    const [currentPath, setCurrentPath] = useState('/');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    const { directory, loading, error, refetch } = useWorkspaceDirectory(currentPath);

    const handleNavigate = useCallback((path: string) => {
        setCurrentPath(path);
        setSelectedFile(null);
    }, []);

    const handleSelectFile = useCallback((path: string) => {
        setSelectedFile(prev => prev === path ? null : path);
    }, []);

    return (
        <div className='space-y-4'>
            {/* Sub-tab toggle */}
            <div className='flex items-center gap-2'>
                <div className='flex rounded-lg bg-zinc-800/50 p-0.5 border border-zinc-700/50'>
                    <button
                        onClick={() => setSubTab('workspace')}
                        className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                            subTab === 'workspace'
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        Workspace
                    </button>
                    <button
                        onClick={() => setSubTab('content')}
                        className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                            subTab === 'content'
                                ? 'bg-zinc-700 text-zinc-100'
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        Content
                    </button>
                </div>
                <span className='text-[10px] text-zinc-600'>
                    {subTab === 'workspace'
                        ? 'Agent workspace filesystem'
                        : 'Content draft pipeline'}
                </span>
            </div>

            {subTab === 'content' ? (
                <ContentPipeline />
            ) : (
                <div className='rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden'>
                    {/* Breadcrumb */}
                    <div className='px-3 py-2 border-b border-zinc-800'>
                        <Breadcrumb
                            path={currentPath}
                            onNavigate={handleNavigate}
                            onRefresh={refetch}
                        />
                    </div>

                    {/* Error state */}
                    {error && (
                        <div className='px-4 py-3 bg-red-500/10 border-b border-red-500/20 text-sm text-red-400'>
                            {error}
                        </div>
                    )}

                    {/* Loading state */}
                    {loading ? (
                        <div className='animate-pulse p-4 space-y-2'>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className='flex items-center gap-3'>
                                    <div className='h-3.5 w-3.5 rounded bg-zinc-800' />
                                    <div className='h-3 rounded bg-zinc-800 flex-1' style={{ maxWidth: `${50 + Math.random() * 30}%` }} />
                                    <div className='h-3 w-10 rounded bg-zinc-800' />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={selectedFile ? 'grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800' : ''}>
                            {/* Directory listing */}
                            <div className={selectedFile ? 'max-h-[60vh] overflow-y-auto' : ''}>
                                <DirectoryListing
                                    entries={directory}
                                    currentPath={currentPath}
                                    onNavigate={handleNavigate}
                                    onSelectFile={handleSelectFile}
                                    selectedFile={selectedFile}
                                />
                            </div>

                            {/* File preview panel */}
                            {selectedFile && (
                                <div className='p-4'>
                                    <FilePreview filePath={selectedFile} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
