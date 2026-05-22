declare module 'bun:test' {
    export function describe(name: string, fn: () => void | Promise<void>): void;
    export function test(name: string, fn: () => void | Promise<void>): void;
    export function beforeEach(fn: () => void | Promise<void>): void;
    export function afterEach(fn: () => void | Promise<void>): void;
    export function expect(actual: unknown): any;
}
