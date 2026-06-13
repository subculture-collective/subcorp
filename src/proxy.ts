/**
 * Next.js proxy — attaches request correlation IDs.
 *
 * For each incoming request:
 * 1. Reads x-request-id header (if exists) or generates a new one
 * 2. Sets x-request-id on the response
 * 3. Wraps the request in AsyncLocalStorage context so the logger
 *    can automatically enrich all logs with the request ID
 *
 * Only applies to API routes (/api/*) to avoid overhead on static assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRequestId } from '@/lib/request-id';

export function proxy(request: NextRequest) {
    const requestId =
        request.headers.get('x-request-id') ?? generateRequestId();

    // We cannot use AsyncLocalStorage.run() in Edge middleware directly,
    // but we CAN pass the request ID via headers so the API route handler
    // can pick it up and establish the context.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    response.headers.set('x-request-id', requestId);

    return response;
}

export const config = {
    // Only run on API routes — skip static assets, images, etc.
    matcher: '/api/:path*',
};
