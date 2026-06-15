import { describe, it, expect } from 'vitest';
import { proxy } from '@/src/proxy';
import { NextRequest } from 'next/server';

describe('Proxy middleware', () => {
  it('should set x-request-id header', () => {
    const req = new NextRequest('http://localhost/api/test', {
      headers: new Headers({ 'x-request-id': 'test-123' })
    });

    const res = proxy(req);
    expect(res.headers.get('x-request-id')).toBe('test-123');
  });

  it('should generate new x-request-id if not provided', () => {
    const req = new NextRequest('http://localhost/api/test');
    const res = proxy(req);
    const id = res.headers.get('x-request-id');
    expect(id).toBeDefined();
    expect(id?.length).toBeGreaterThan(0);
  });
});