import { beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal in-memory localStorage for the node test environment.
const mem = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
const { enqueue, flush, pending } = await import('../lib/outbox');

const msg = (message: string) => ({ type: 'Request a formula', message, email: '' });
beforeEach(() => { mem.clear(); vi.unstubAllGlobals(); vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) }); });

describe('offline feedback outbox', () => {
  it('queues messages in order', () => { enqueue(msg('a')); enqueue(msg('b')); expect(pending().map((m) => m.message)).toEqual(['a', 'b']); });
  it('sends everything and empties the queue when online', async () => {
    enqueue(msg('a')); enqueue(msg('b'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    expect(await flush('https://x.test')).toBe(2);
    expect(pending()).toEqual([]);
  });
  it('keeps messages when still offline (fetch throws)', async () => {
    enqueue(msg('a'));
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(await flush('https://x.test')).toBe(0);
    expect(pending().length).toBe(1);
  });
  it('keeps messages on server errors (5xx) to retry later', async () => {
    enqueue(msg('a'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })));
    await flush('https://x.test');
    expect(pending().length).toBe(1);
  });
  it('drops a message the server rejects for good (4xx) so it cannot loop forever', async () => {
    enqueue(msg('a'));
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 422 })));
    expect(await flush('https://x.test')).toBe(0);
    expect(pending()).toEqual([]);
  });
});
