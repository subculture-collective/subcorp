// AgentAvatar — reusable avatar component for agent portraits
// Renders as a circular bust portrait with a solid colored border
// matching the agent's identity color from the Dracula × Catppuccin theme

import Image from 'next/image';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<AvatarSize, { px: number; border: number; text: string; overlap: number }> = {
    xs: { px: 32, border: 2, text: 'text-[9px]', overlap: -10 },
    sm: { px: 42, border: 2, text: 'text-[10px]', overlap: -12 },
    md: { px: 56, border: 2, text: 'text-xs', overlap: -14 },
    lg: { px: 72, border: 3, text: 'text-sm', overlap: -18 },
    xl: { px: 96, border: 3, text: 'text-base', overlap: -24 },
};

// System color for non-agent events
const SYSTEM_COLOR = '#585b70'; // --color-mist

function resolveAvatar(agentId: string): { src: string; color: string; alt: string } {
    const agent = AGENTS[agentId as AgentId];
    if (agent) {
        return {
            src: `/avatars/${agentId}.png`,
            color: agent.color,
            alt: agent.displayName,
        };
    }
    // System / unknown agent — use subcorp logo
    return {
        src: '/avatars/subcorp.png',
        color: SYSTEM_COLOR,
        alt: agentId || 'System',
    };
}

export function AgentAvatar({
    agentId,
    size = 'sm',
    showBorder = true,
    className = '',
}: {
    agentId: string;
    size?: AvatarSize;
    showBorder?: boolean;
    className?: string;
}) {
    const { px, border } = SIZE_MAP[size];
    const { src, color, alt } = resolveAvatar(agentId);
    const outerPx = showBorder ? px + border * 2 : px;

    return (
        <div
            className={`relative shrink-0 rounded-full ${className}`}
            style={{
                width: outerPx,
                height: outerPx,
                ...(showBorder ? {
                    border: `${border}px solid ${color}`,
                    boxShadow: `0 0 8px ${color}30`,
                } : {}),
            }}
        >
            <div className='w-full h-full rounded-full overflow-hidden'>
                <Image
                    src={src}
                    alt={alt}
                    width={px}
                    height={px}
                    className='object-cover object-top w-full h-full'
                    sizes={`${px}px`}
                />
            </div>
        </div>
    );
}

/** Stacked row of overlapping agent avatars — used for participant lists */
export function AgentAvatarStack({
    agentIds,
    size = 'xs',
    max = 6,
    className = '',
}: {
    agentIds: string[];
    size?: AvatarSize;
    max?: number;
    className?: string;
}) {
    const visible = agentIds.slice(0, max);
    const overflow = agentIds.length - max;
    const { overlap } = SIZE_MAP[size];

    return (
        <div className={`flex items-center ${className}`}>
            {visible.map((id, i) => (
                <div
                    key={id}
                    className='relative'
                    style={{ marginLeft: i === 0 ? 0 : overlap, zIndex: visible.length - i }}
                >
                    <AgentAvatar agentId={id} size={size} showBorder />
                </div>
            ))}
            {overflow > 0 && (
                <span className={`ml-1.5 text-dust ${SIZE_MAP[size].text} font-mono`}>
                    +{overflow}
                </span>
            )}
        </div>
    );
}

/** SubCorp avatar using the B/W logo */
export function SubcorpAvatar({
    size = 'md',
    showBorder = true,
    className = '',
}: {
    size?: AvatarSize;
    showBorder?: boolean;
    className?: string;
}) {
    const { px, border } = SIZE_MAP[size];
    const color = '#cba6f7'; // --color-scan (mauve — collective identity)
    const outerPx = showBorder ? px + border * 2 : px;

    return (
        <div
            className={`relative shrink-0 rounded-full ${className}`}
            style={{
                width: outerPx,
                height: outerPx,
                ...(showBorder ? {
                    border: `${border}px solid ${color}`,
                    boxShadow: `0 0 8px ${color}30`,
                } : {}),
            }}
        >
            <div className='w-full h-full rounded-full overflow-hidden'>
                <Image
                    src='/avatars/subcorp.png'
                    alt='SubCorp Logo'
                    width={px}
                    height={px}
                    className='object-cover object-center w-full h-full'
                    sizes={`${px}px`}
                />
            </div>
        </div>
    );
}
