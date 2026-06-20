// Tool registry — maps agents to their available native tools
import type { AgentId, ToolDefinition } from '../types';
import type { NativeTool } from './types';
import { bashTool } from './tools/bash';
import { webSearchTool } from './tools/web-search';
import { webFetchTool } from './tools/web-fetch';
import { fileReadTool } from './tools/file-read';
import { fileWriteTool, createFileWriteExecute, WRITE_ACLS } from './tools/file-write';
import { sendToAgentTool } from './tools/send-to-agent';
import { spawnDroidTool } from './tools/spawn-droid';
import { checkDroidTool } from './tools/check-droid';
import { memorySearchTool } from './tools/memory-search';
import {
    memoryWriteTool,
    createMemoryWriteExecute,
} from './tools/memory-write';
import {
    scratchpadReadTool,
    scratchpadUpdateTool,
    createScratchpadReadExecute,
    createScratchpadUpdateExecute,
} from './tools/scratchpad';
import {
    proposePolicyChangeTool,
    createProposePolicyChangeExecute,
} from './tools/propose-policy-change';
import {
    proposeMissionTool,
    createProposeMissionExecute,
} from './tools/propose-mission';
import {
    castVetoTool,
    createCastVetoExecute,
} from './tools/cast-veto';
import {
    DOCKER_BACKED_TOOL_NAMES,
    dockerBackedToolsEnabled,
} from './executor';

/** All registered native tools */
const ALL_TOOLS: NativeTool[] = [
    bashTool,
    webSearchTool,
    webFetchTool,
    fileReadTool,
    fileWriteTool,
    sendToAgentTool,
    spawnDroidTool,
    checkDroidTool,
    memorySearchTool,
    memoryWriteTool,
    scratchpadReadTool,
    scratchpadUpdateTool,
    proposePolicyChangeTool,
    proposeMissionTool,
    castVetoTool,
];

/**
 * Get all tools available to a specific agent.
 * Returns ToolDefinition[] suitable for passing directly to the LLM.
 * For file_write, binds the agentId into the execute function for ACL enforcement.
 * For propose_policy_change, binds the agentId to track who is proposing.
 */
export function getAgentTools(agentId: AgentId, sessionId?: string): ToolDefinition[] {
    return ALL_TOOLS
        .filter(tool => tool.agents.includes(agentId))
        .filter(tool => dockerBackedToolsEnabled() || !DOCKER_BACKED_TOOL_NAMES.has(tool.name))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ agents: _agents, ...tool }) => {
            // Bind agentId into file_write's execute for path ACL enforcement
            if (tool.name === 'file_write') {
                return { ...tool, execute: createFileWriteExecute(agentId) };
            }
            // Bind agentId into propose_policy_change's execute to track proposer
            if (tool.name === 'propose_policy_change') {
                return {
                    ...tool,
                    execute: createProposePolicyChangeExecute(agentId),
                };
            }
            // Bind agentId into propose_mission's execute to track proposer
            if (tool.name === 'propose_mission') {
                return {
                    ...tool,
                    execute: createProposeMissionExecute(agentId, sessionId),
                };
            }
            // Bind agentId into cast_veto to track who is vetoing
            if (tool.name === 'cast_veto') {
                return {
                    ...tool,
                    execute: createCastVetoExecute(agentId),
                };
            }
            // Bind agentId into memory tools
            if (tool.name === 'memory_write') {
                return { ...tool, execute: createMemoryWriteExecute(agentId) };
            }
            if (tool.name === 'scratchpad_read') {
                return { ...tool, execute: createScratchpadReadExecute(agentId) };
            }
            if (tool.name === 'scratchpad_update') {
                return { ...tool, execute: createScratchpadUpdateExecute(agentId) };
            }
            return tool;
        });
}

/**
 * Get a limited toolset for droid sub-agents.
 * Droids get file_read, file_write (ACL-bound to droids/ prefix), web_search, and web_fetch.
 * They intentionally do not get raw bash because shell redirection can bypass file_write ACLs.
 */
export function getDroidTools(droidId: string): ToolDefinition[] {
    const droidToolNames = ['file_read', 'file_write', 'web_search', 'web_fetch'];
    return ALL_TOOLS
        .filter(tool => droidToolNames.includes(tool.name))
        .filter(tool => dockerBackedToolsEnabled() || !DOCKER_BACKED_TOOL_NAMES.has(tool.name))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ agents: _agents, ...tool }) => {
            if (tool.name === 'file_write') {
                return { ...tool, execute: createFileWriteExecute(droidId) };
            }
            return tool;
        });
}

/**
 * Get tool names available to a specific agent.
 */
export function getAgentToolNames(agentId: AgentId): string[] {
    return ALL_TOOLS
        .filter(tool => tool.agents.includes(agentId))
        .filter(tool => dockerBackedToolsEnabled() || !DOCKER_BACKED_TOOL_NAMES.has(tool.name))
        .map(tool => tool.name);
}

/**
 * Get write-path prefixes for an agent, or empty array if file_write is not available.
 */
export function getAgentWritePaths(agentId: AgentId): string[] {
    if (!dockerBackedToolsEnabled()) return [];
    if (!fileWriteTool.agents.includes(agentId)) return [];
    return WRITE_ACLS[agentId] ?? [];
}

/**
 * List all registered tools.
 */
export function listAllTools(): NativeTool[] {
    return ALL_TOOLS.filter(tool =>
        dockerBackedToolsEnabled() || !DOCKER_BACKED_TOOL_NAMES.has(tool.name),
    );
}
