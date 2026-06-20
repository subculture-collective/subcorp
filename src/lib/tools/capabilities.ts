import type { AgentId } from '../types';

export type ToolName =
    | 'bash'
    | 'web_search'
    | 'web_fetch'
    | 'file_read'
    | 'file_write'
    | 'send_to_agent'
    | 'spawn_droid'
    | 'check_droid'
    | 'memory_search'
    | 'memory_write'
    | 'scratchpad_read'
    | 'scratchpad_update'
    | 'propose_policy_change'
    | 'propose_mission'
    | 'cast_veto';

export interface AgentCapability {
    tools: readonly ToolName[];
    writePaths: readonly string[];
    canUseShell: boolean;
    canWriteWorkspace: boolean;
    canSpawnDroids: boolean;
    canPublishTrustedArtifacts: boolean;
}

const COMMON_AGENT_TOOLS = [
    'web_search',
    'web_fetch',
    'file_read',
    'send_to_agent',
    'spawn_droid',
    'check_droid',
    'memory_search',
    'memory_write',
    'scratchpad_read',
    'scratchpad_update',
    'propose_policy_change',
    'propose_mission',
    'cast_veto',
] as const satisfies readonly ToolName[];

const WRITER_TOOLS = [...COMMON_AGENT_TOOLS, 'file_write'] as const satisfies readonly ToolName[];
const SHELL_WRITER_TOOLS = [...WRITER_TOOLS, 'bash'] as const satisfies readonly ToolName[];

export const AGENT_CAPABILITIES: Record<AgentId, AgentCapability> = {
    chora: {
        tools: COMMON_AGENT_TOOLS,
        writePaths: [],
        canUseShell: false,
        canWriteWorkspace: false,
        canSpawnDroids: true,
        canPublishTrustedArtifacts: false,
    },
    subrosa: {
        tools: COMMON_AGENT_TOOLS,
        writePaths: [],
        canUseShell: false,
        canWriteWorkspace: false,
        canSpawnDroids: true,
        canPublishTrustedArtifacts: false,
    },
    thaum: {
        tools: COMMON_AGENT_TOOLS,
        writePaths: [],
        canUseShell: false,
        canWriteWorkspace: false,
        canSpawnDroids: true,
        canPublishTrustedArtifacts: false,
    },
    praxis: {
        tools: SHELL_WRITER_TOOLS,
        writePaths: ['agents/praxis/', 'output/', 'shared/', 'projects/'],
        canUseShell: true,
        canWriteWorkspace: true,
        canSpawnDroids: true,
        canPublishTrustedArtifacts: true,
    },
    mux: {
        tools: SHELL_WRITER_TOOLS,
        writePaths: ['agents/mux/', 'output/', 'shared/', 'projects/'],
        canUseShell: true,
        canWriteWorkspace: true,
        canSpawnDroids: true,
        canPublishTrustedArtifacts: true,
    },
    primus: {
        tools: WRITER_TOOLS,
        writePaths: ['agents/primus/', 'output/', 'shared/', 'projects/'],
        canUseShell: false,
        canWriteWorkspace: true,
        canSpawnDroids: true,
        canPublishTrustedArtifacts: true,
    },
};

export const DROID_TOOL_NAMES = ['file_read', 'file_write', 'web_search', 'web_fetch'] as const satisfies readonly ToolName[];

const UNKNOWN_AGENT_CAPABILITY: AgentCapability = {
    tools: [],
    writePaths: [],
    canUseShell: false,
    canWriteWorkspace: false,
    canSpawnDroids: false,
    canPublishTrustedArtifacts: false,
};

export function isDroidAgent(agentId: string): boolean {
    return agentId.startsWith('droid-');
}

export function isKnownAgentId(agentId: string): agentId is AgentId {
    return Object.prototype.hasOwnProperty.call(AGENT_CAPABILITIES, agentId);
}

export function getAgentCapability(agentId: string): AgentCapability {
    return isKnownAgentId(agentId) ? AGENT_CAPABILITIES[agentId] : UNKNOWN_AGENT_CAPABILITY;
}

export function getCapabilityToolNames(agentId: string): string[] {
    return [...getAgentCapability(agentId).tools];
}

export function getDroidToolNames(): string[] {
    return [...DROID_TOOL_NAMES];
}

export function getCapabilityWritePaths(agentId: string): string[] {
    return [...getAgentCapability(agentId).writePaths];
}

export function canUseShell(agentId: string): boolean {
    return !isDroidAgent(agentId) && getAgentCapability(agentId).canUseShell;
}

export function canWriteWorkspace(agentId: string): boolean {
    return isDroidAgent(agentId) || getAgentCapability(agentId).canWriteWorkspace;
}

export const WRITE_ACLS: Record<AgentId, string[]> = Object.fromEntries(
    Object.entries(AGENT_CAPABILITIES).map(([agentId, capability]) => [
        agentId,
        [...capability.writePaths],
    ]),
) as Record<AgentId, string[]>;
