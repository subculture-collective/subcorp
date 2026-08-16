import { describe, expect, test } from 'bun:test';
import fixture from './fixtures/receipt-redaction-safe-split.json';

type ReceiptFixture = {
    private_receipt: Record<string, unknown>;
    public_receipt: Record<string, unknown>;
    redaction_proof: {
        preserved_fields: string[];
        public_must_not_contain: string[];
        public_must_not_match: string[];
        public_must_contain: string[];
    };
};

const typedFixture = fixture as ReceiptFixture;

function readPath(source: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, segment) => {
        if (!current || typeof current !== 'object') {
            return undefined;
        }

        return (current as Record<string, unknown>)[segment];
    }, source);
}

describe('receipt redaction safe split fixture', () => {
    test('public receipt preserves only approved identity fields from private receipt', () => {
        for (const path of typedFixture.redaction_proof.preserved_fields) {
            expect(readPath(typedFixture.public_receipt, path)).toBe(
                readPath(typedFixture.private_receipt, path),
            );
        }
    });

    test('public receipt excludes private commands, hosts, tokens, credentials, and audit locations', () => {
        const publicReceiptText = JSON.stringify(typedFixture.public_receipt);

        for (const forbiddenText of typedFixture.redaction_proof.public_must_not_contain) {
            expect(publicReceiptText).not.toContain(forbiddenText);
        }

        for (const forbiddenPattern of typedFixture.redaction_proof.public_must_not_match) {
            expect(publicReceiptText).not.toMatch(new RegExp(forbiddenPattern));
        }
    });

    test('public receipt keeps publishable operational proof', () => {
        const publicReceiptText = JSON.stringify(typedFixture.public_receipt);

        for (const requiredText of typedFixture.redaction_proof.public_must_contain) {
            expect(publicReceiptText).toContain(requiredText);
        }

        expect(readPath(typedFixture.public_receipt, 'redaction.status')).toBe('passed');
        expect(readPath(typedFixture.public_receipt, 'rollback.available')).toBe(true);
        expect(readPath(typedFixture.public_receipt, 'rollback.proof_status')).toBe('passed');
    });
});
