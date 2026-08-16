import { describe, expect, test } from 'bun:test';

import { validateContentReviewPacket } from '@/lib/ops/content-review-gate';
import titleOnlyFixture from './fixtures/content-review-title-only.json';

type TitleOnlyFixture = {
    input: {
        title: string;
    };
    expected: {
        accepted: false;
        missingFields: string[];
        artifactId: null;
        bodyChecksum: null;
        reviewMission: null;
    };
};

const fixture = titleOnlyFixture as TitleOnlyFixture;

describe('content review packet gate fixtures', () => {
    test('title-only input is rejected before artifact identity or review mission creation', () => {
        const result = validateContentReviewPacket(fixture.input);

        expect(result.accepted).toBe(fixture.expected.accepted);
        expect(result.missingFields).toEqual(fixture.expected.missingFields);
        expect(result.artifactId).toBe(fixture.expected.artifactId);
        expect(result.bodyChecksum).toBe(fixture.expected.bodyChecksum);
        expect(result.reviewMission).toBe(fixture.expected.reviewMission);
    });
});
