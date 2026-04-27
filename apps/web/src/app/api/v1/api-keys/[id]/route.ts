import { prisma } from '@makayeel/db';
import { auth } from '@/auth';
import { jsonOk, jsonError } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return jsonError(401, 'UNAUTHORIZED', 'Sign in required.');

  const row = await prisma.apiKey.findUnique({ where: { id } });
  if (!row) return jsonError(404, 'NOT_FOUND', 'Key not found.');
  if (row.userId !== session.user.id) return jsonError(403, 'FORBIDDEN', 'Not your key.');

  await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return jsonOk({ revoked: id });
}
