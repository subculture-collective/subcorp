import type { NextRequest } from 'next/server';
import { generateRequestId, requestContext } from '@/lib/request-context';

export function withRequestContext<T>(
    req: NextRequest,
    handler: () => T | Promise<T>,
): T | Promise<T> {
    const requestId = req.headers.get('x-request-id') ?? generateRequestId();
    const method = req.method;
    const path = new URL(req.url).pathname;

    return requestContext.run({ requestId, method, path }, handler);
}
