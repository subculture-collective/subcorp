import type { NextRequest } from 'next/server';
import { requestContext } from '@/lib/request-context';
import { generateRequestId } from '@/lib/request-id';

export function withRequestContext<T>(
    req: NextRequest,
    handler: () => T | Promise<T>,
): T | Promise<T> {
    const requestId = req.headers.get('x-request-id') ?? generateRequestId();
    const method = req.method;
    const path = new URL(req.url).pathname;

    return requestContext.run({ requestId, method, path }, handler);
}
