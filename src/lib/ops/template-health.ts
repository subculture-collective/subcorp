// Template health — surface underperforming step prompt templates
import { sql } from '@/lib/db';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'template-health' });

const MIN_RUNS_FOR_ALERT = 10;
const LOW_SUCCESS_RATE = 50;

export interface TemplateHealthEntry {
    kind: string;
    template_version: number;
    total_runs: number;
    succeeded: number;
    success_rate: number;
    avg_duration_secs: number | null;
}

export async function checkTemplateHealth(): Promise<{
    underperforming: TemplateHealthEntry[];
}> {
    const rows = await sql<TemplateHealthEntry[]>`
        SELECT kind, template_version, total_runs, succeeded, success_rate, avg_duration_secs
        FROM step_template_performance
        WHERE total_runs >= ${MIN_RUNS_FOR_ALERT}
          AND success_rate < ${LOW_SUCCESS_RATE}
        ORDER BY success_rate ASC
    `;

    for (const row of rows) {
        log.warn('Underperforming step template', {
            kind: row.kind,
            version: row.template_version,
            successRate: `${row.success_rate}%`,
            totalRuns: row.total_runs,
        });
    }

    return { underperforming: rows };
}
