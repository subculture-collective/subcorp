import { describe, expect, test } from 'bun:test';
import { computeNextCronFireAt, shouldCronScheduleFire } from '../src/lib/ops/cron-utils';

describe('cron schedule recovery', () => {
  test('fires a weekly schedule when persisted next_fire_at is overdue by more than 24h', () => {
    expect(
      shouldCronScheduleFire(
        '0 23 * * 0',
        'America/Chicago',
        '2026-06-01T04:20:25.313Z',
        '2026-06-08T04:00:25.047Z',
        new Date('2026-06-10T03:06:00.000Z'),
      ),
    ).toBe(true);
  });

  test('does not fire future persisted next_fire_at', () => {
    expect(
      shouldCronScheduleFire(
        '0 23 * * 0',
        'America/Chicago',
        '2026-06-08T04:00:00.000Z',
        '2026-06-15T04:00:00.000Z',
        new Date('2026-06-10T03:06:00.000Z'),
      ),
    ).toBe(false);
  });

  test('computes next weekly fire beyond a 7-day boundary', () => {
    expect(
      computeNextCronFireAt(
        '0 23 * * 0',
        'America/Chicago',
        new Date('2026-06-10T03:06:00.000Z'),
      ).toISOString(),
    ).toBe('2026-06-15T04:00:00.000Z');
  });
});
