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

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return jsonError(404, 'NOT_FOUND', 'Alert not found.');
  if (alert.userId !== session.user.id) return jsonError(403, 'FORBIDDEN', 'Not your alert.');

  await prisma.alert.delete({ where: { id } });
  return jsonOk({ deleted: id });
}
