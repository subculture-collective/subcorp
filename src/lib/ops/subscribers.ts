// Subscriber management — SUBCORP Weekly / Daily newsletter
import { sql } from '@/lib/db';

export type SubscribePlan = 'daily' | 'weekly' | 'both';

interface SubscribeInput {
    email: string;
    plan: SubscribePlan;
    source: string;
}

/**
 * Upsert a subscriber. Re-subscribes if previously unsubscribed.
 * Returns the subscriber id and whether this is a new signup.
 */
export async function subscribe({ email, plan, source }: SubscribeInput) {
    const rows = await sql`
        INSERT INTO ops_subscribers (email, plan, source)
        VALUES (${email}, ${plan}, ${source})
        ON CONFLICT (email) DO UPDATE
            SET plan       = ${plan},
                status     = 'active',
                source     = ${source},
                updated_at = now()
        RETURNING id,
            (xmax = 0) AS is_new
    `;
    return { id: rows[0].id as string, isNew: rows[0].is_new as boolean };
}

/** Mark a subscriber as unsubscribed. */
export async function unsubscribe(email: string) {
    await sql`
        UPDATE ops_subscribers
        SET status = 'unsubscribed', updated_at = now()
        WHERE email = ${email}
    `;
}

/** Count subscribers by plan (only active). */
export async function getSubscriberCount() {
    const rows = await sql`
        SELECT
            count(*) FILTER (WHERE plan IN ('daily', 'both'))  AS daily,
            count(*) FILTER (WHERE plan IN ('weekly', 'both')) AS weekly,
            count(*) FILTER (WHERE plan = 'both')              AS both,
            count(*)                                           AS total
        FROM ops_subscribers
        WHERE status = 'active'
    `;
    const r = rows[0];
    return {
        daily: Number(r.daily),
        weekly: Number(r.weekly),
        both: Number(r.both),
        total: Number(r.total),
    };
}
