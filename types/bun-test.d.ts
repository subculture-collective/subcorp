declare module 'bun:test' {
    interface Expectation {
        toBe(expected: unknown): void;
        toEqual(expected: unknown): void;
        toContain(expected: unknown): void;
        toMatch(expected: RegExp | string): void;
        toHaveLength(expected: number): void;
        toBeTruthy(): void;
        toBeFalsy(): void;
        toBeNull(): void;
        toBeDefined(): void;
    }

    export function describe(name: string, fn: () => void | Promise<void>): void;
    export function test(name: string, fn: () => void | Promise<void>): void;
    export function beforeEach(fn: () => void | Promise<void>): void;
    export function afterEach(fn: () => void | Promise<void>): void;
    export function expect(actual: unknown): Expectation;
}
