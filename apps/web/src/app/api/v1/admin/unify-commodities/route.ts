import { prisma, unifyCommodities } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // up to 5 minutes — large datasets take time

/**
 * POST /api/v1/admin/unify-commodities
 *
 * Body: { mode: 'dry' | 'live' }
 * - `dry`: report what WOULD change (default).
 * - `live`: actually fold legacy slugs into canonical and delete the legacy
 *           commodities. Idempotent.
 *
 * Auth: either an admin Auth.js session OR an `Authorization: Bearer <ADMIN_API_KEY>`
 * header (when ADMIN_API_KEY is set in env). The bearer-token path lets us
 * run the migration from a script without a browser session.
 */
export async function POST(req: Request) {
  const adminKey = process.env.ADMIN_API_KEY;
  const auth_header = req.headers.get('authorization') ?? '';
  const bearerOk =
    adminKey && auth_header === `Bearer ${adminKey}` && adminKey.length >= 16;

  if (!bearerOk) {
    const session = await auth();
    if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');
    // @ts-expect-error — role attached by auth callback
    if (session.user.role !== 'ADMIN') return jsonError(403, 'FORBIDDEN', 'Admin only.');
  }

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === 'live' ? 'live' : 'dry';

  try {
    const report = await unifyCommodities(prisma, mode);
    return jsonOk(report);
  } catch (err) {
    return jsonError(500, 'UNIFY_FAILED', (err as Error).message);
  }
}
