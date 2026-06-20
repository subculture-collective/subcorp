import { describe, expect, test } from 'bun:test';
import {
    AGENT_CAPABILITIES,
    DROID_TOOL_NAMES,
    canUseShell,
    canWriteWorkspace,
    getCapabilityToolNames,
    getCapabilityWritePaths,
    getDroidToolNames,
    isKnownAgentId,
    WRITE_ACLS,
} from '../src/lib/tools/capabilities';
import { getAgentToolNames, getAgentWritePaths, getDroidTools } from '../src/lib/tools/registry';

describe('central capability matrix regressions', () => {
    test('registry tool names are derived from capability matrix', () => {
        expect(getAgentToolNames('praxis').sort()).toEqual([...AGENT_CAPABILITIES.praxis.tools].sort());
        expect(getAgentToolNames('chora').sort()).toEqual([...AGENT_CAPABILITIES.chora.tools].sort());
        expect(getAgentToolNames('primus')).toContain('file_write');
        expect(getAgentToolNames('primus')).not.toContain('bash');
        expect(getAgentToolNames('chora')).not.toContain('file_write');
    });

    test('write ACLs and prompt capabilities share the same source', () => {
        expect(WRITE_ACLS).toEqual({
            chora: [],
            subrosa: [],
            thaum: [],
            praxis: ['agents/praxis/', 'output/', 'shared/', 'projects/'],
            mux: ['agents/mux/', 'output/', 'shared/', 'projects/'],
            primus: ['agents/primus/', 'output/', 'shared/', 'projects/'],
        });
        expect(getCapabilityWritePaths('mux')).toEqual(getAgentWritePaths('mux'));
        expect(canWriteWorkspace('chora')).toBe(false);
        expect(canWriteWorkspace('praxis')).toBe(true);
        expect(canWriteWorkspace('droid-abc123')).toBe(true);
    });

    test('shell and droid capabilities stay explicit', () => {
        expect(canUseShell('praxis')).toBe(true);
        expect(canUseShell('mux')).toBe(true);
        expect(canUseShell('primus')).toBe(false);
        expect(canUseShell('droid-abc123')).toBe(false);
        expect(getCapabilityToolNames('praxis')).toContain('bash');
        expect(getCapabilityToolNames('primus')).not.toContain('bash');
        expect(getDroidToolNames()).toEqual([...DROID_TOOL_NAMES]);
        expect(getDroidTools('droid-abc123').map(tool => tool.name).sort()).toEqual([...DROID_TOOL_NAMES].sort());
    });

    test('unknown runtime agent ids fail closed instead of throwing', () => {
        expect(isKnownAgentId('system')).toBe(false);
        expect(getCapabilityToolNames('system')).toEqual([]);
        expect(getCapabilityWritePaths('system')).toEqual([]);
        expect(canUseShell('system')).toBe(false);
        expect(canWriteWorkspace('system')).toBe(false);
        expect(getAgentToolNames('system' as never)).toEqual([]);
        expect(getAgentWritePaths('system' as never)).toEqual([]);
    });
});
