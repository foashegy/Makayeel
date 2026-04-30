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

/** Postgres-backed token bucket. Survives deploys, distributes across
 *  multiple instances, no external Redis dependency. */
const DEFAULT_CAPACITY = 60; // requests
const DEFAULT_WINDOW_MS = 60_000; // per minute

export interface RateLimitOptions {
  capacity?: number;
  windowMs?: number;
  /** What to do if the rate-limit table itself errors out.
   *  - 'closed' (default, safe for mutations): treat as rate-limited (returns 503-equivalent)
   *  - 'open' (acceptable for read-heavy endpoints): pass through legitimate traffic
   *  Mutations should NEVER fail-open — an attacker who can pressure the DB
   *  could bypass the limiter. */
  onError?: 'closed' | 'open';
}

export async function checkRateLimit(
  bucketKey: string,
  capacityOrOptions: number | RateLimitOptions = DEFAULT_CAPACITY,
  windowMsArg = DEFAULT_WINDOW_MS,
): Promise<{ ok: boolean; retryAfter: number; degraded?: true }> {
  const opts: RateLimitOptions = typeof capacityOrOptions === 'object'
    ? capacityOrOptions
    : { capacity: capacityOrOptions, windowMs: windowMsArg };
  const capacity = opts.capacity ?? DEFAULT_CAPACITY;
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const onError = opts.onError ?? 'closed';

  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimit.findUnique({ where: { bucketKey } });
      if (!existing || existing.windowStart < cutoff) {
        await tx.rateLimit.upsert({
          where: { bucketKey },
          create: { bucketKey, tokens: capacity - 1, windowStart: now },
          update: { tokens: capacity - 1, windowStart: now },
        });
        return { ok: true, retryAfter: 0 };
      }
      if (existing.tokens > 0) {
        await tx.rateLimit.update({
          where: { bucketKey },
          data: { tokens: existing.tokens - 1 },
        });
        return { ok: true, retryAfter: 0 };
      }
      const retryAfter = Math.ceil((existing.windowStart.getTime() + windowMs - now.getTime()) / 1000);
      return { ok: false, retryAfter: Math.max(retryAfter, 1) };
    });
    return result;
  } catch (err) {
    console.error('[ratelimit] DB error:', (err as Error).message);
    // Fail-CLOSED for mutations (default): refuse the request. The handler
    // surfaces this as 503-style "service degraded" so an attacker who can
    // pressure the DB can't bypass the limiter.
    if (onError === 'open') return { ok: true, retryAfter: 0, degraded: true };
    return { ok: false, retryAfter: 60, degraded: true };
  }
}
