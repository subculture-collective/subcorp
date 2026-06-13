declare module 'bun:test' {
    interface Expectation {
        not: Expectation;
        rejects: Expectation;
        toBe(expected: unknown): void;
        toEqual(expected: unknown): void;
        toContain(expected: unknown): void;
        toMatch(expected: RegExp | string): void;
        toHaveLength(expected: number): void;
        toBeTruthy(): void;
        toBeFalsy(): void;
        toBeTrue(): void;
        toBeFalse(): void;
        toBeNull(): void;
        toBeDefined(): void;
        toBeInstanceOf(expected: unknown): void;
        toBeGreaterThan(expected: number): void;
        toBeGreaterThanOrEqual(expected: number): void;
        toBeLessThan(expected: number): void;
        toThrow(expected?: unknown): void;
    }

    export function describe(name: string, fn: () => void | Promise<void>): void;
    export function test(name: string, fn: () => void | Promise<void>): void;
    export function beforeEach(fn: () => void | Promise<void>): void;
    export function afterEach(fn: () => void | Promise<void>): void;
    export function expect(actual: unknown): Expectation;
    export const mock: {
        (fn?: (...args: unknown[]) => unknown): (...args: unknown[]) => unknown;
        module(name: string, factory: () => unknown): void;
        restore(): void;
    };
}
