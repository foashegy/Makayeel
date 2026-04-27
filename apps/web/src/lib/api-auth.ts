import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@makayeel/db';
import { auth } from '@/auth';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

/** Session OR API-key auth, in that order. Returns the userId on success. */
export async function resolveRequester(req: Request): Promise<
  { kind: 'session'; userId: string; role: 'USER' | 'ADMIN' } | { kind: 'apiKey'; userId: string }
> {
  const session = await auth();
  if (session?.user?.id) {
    // @ts-expect-error — role is attached in session callback
    return { kind: 'session', userId: session.user.id, role: session.user.role ?? 'USER' };
  }
  const authz = req.headers.get('authorization');
  if (authz?.startsWith('Bearer ')) {
    const token = authz.slice('Bearer '.length).trim();
    const row = await prisma.apiKey.findUnique({
      where: { hashedKey: hashApiKey(token) },
      select: { id: true, userId: true, revokedAt: true },
    });
    if (row && !row.revokedAt) {
      await prisma.apiKey.update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
      });
      return { kind: 'apiKey', userId: row.userId };
    }
  }
  throw new UnauthorizedError();
}

export class UnauthorizedError extends Error {
  constructor() {
    super('UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}
export class ForbiddenError extends Error {
  constructor() {
    super('FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/** In-memory token bucket — good enough for MVP, resets on process restart.
 *  Production should replace with Redis. Documented in the API route README. */
const buckets = new Map<string, { tokens: number; lastRefill: number }>();
const CAPACITY = 60; // requests
const WINDOW_MS = 60_000; // per minute

export function checkRateLimit(keyId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(keyId) ?? { tokens: CAPACITY, lastRefill: now };
  // Refill proportional to elapsed window.
  const elapsed = now - bucket.lastRefill;
  const refill = Math.floor((elapsed / WINDOW_MS) * CAPACITY);
  if (refill > 0) {
    bucket.tokens = Math.min(CAPACITY, bucket.tokens + refill);
    bucket.lastRefill = now;
  }
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    buckets.set(keyId, bucket);
    return { ok: true, retryAfter: 0 };
  }
  const retryAfter = Math.ceil(WINDOW_MS / CAPACITY / 1000);
  buckets.set(keyId, bucket);
  return { ok: false, retryAfter };
}
