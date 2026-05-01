import type { PrismaClient } from '@prisma/client';
import { CANONICAL_COMMODITIES, LEGACY_SLUG_MAP } from './canonical-commodities';

export interface UnifyReport {
  mode: 'dry' | 'live';
  canonicalCreated: string[];
  canonicalUpdated: string[];
  legacyDeleted: string[];
  legacyUnknown: string[];
  pricesRepointed: number;
  pricesArchivedAsLoser: number;
  alertsRepointed: number;
  watchlistsRepointed: number;
  watchlistsDeleted: number;
  errors: string[];
}

/**
 * Folds legacy commodity slugs into canonical ones. Idempotent — re-runs are
 * safe; subsequent calls find nothing to migrate.
 *
 * In `dry` mode, the function reports what it WOULD do without writing.
 */
export async function unifyCommodities(
  prisma: PrismaClient,
  mode: 'dry' | 'live' = 'dry',
): Promise<UnifyReport> {
  const dry = mode === 'dry';
  const report: UnifyReport = {
    mode,
    canonicalCreated: [],
    canonicalUpdated: [],
    legacyDeleted: [],
    legacyUnknown: [],
    pricesRepointed: 0,
    pricesArchivedAsLoser: 0,
    alertsRepointed: 0,
    watchlistsRepointed: 0,
    watchlistsDeleted: 0,
    errors: [],
  };

  // Step 1 — ensure all canonical commodities exist with correct names
  for (const c of CANONICAL_COMMODITIES) {
    const existing = await prisma.commodity.findUnique({ where: { slug: c.slug } });
    if (existing) {
      const drift =
        existing.nameAr !== c.nameAr ||
        existing.nameEn !== c.nameEn ||
        existing.category !== c.category ||
        existing.iconKey !== c.iconKey ||
        existing.displayOrder !== c.displayOrder;
      if (drift) {
        report.canonicalUpdated.push(c.slug);
        if (!dry) {
          await prisma.commodity.update({
            where: { slug: c.slug },
            data: {
              nameAr: c.nameAr,
              nameEn: c.nameEn,
              category: c.category,
              iconKey: c.iconKey,
              displayOrder: c.displayOrder,
              isActive: true,
            },
          });
        }
      }
    } else {
      report.canonicalCreated.push(c.slug);
      if (!dry) {
        await prisma.commodity.create({
          data: {
            slug: c.slug,
            nameAr: c.nameAr,
            nameEn: c.nameEn,
            category: c.category,
            iconKey: c.iconKey,
            displayOrder: c.displayOrder,
            isActive: true,
          },
        });
      }
    }
  }

  // Step 2 — migrate legacy commodities
  const allCommodities = await prisma.commodity.findMany();
  const slugToId = new Map(allCommodities.map((c) => [c.slug, c.id]));
  const canonicalSlugs = new Set(CANONICAL_COMMODITIES.map((c) => c.slug));

  for (const c of allCommodities) {
    if (canonicalSlugs.has(c.slug)) continue;

    const target = LEGACY_SLUG_MAP[c.slug];
    if (!target) {
      report.legacyUnknown.push(c.slug);
      continue;
    }
    const targetId = slugToId.get(target.slug);
    if (!targetId) {
      report.errors.push(`target ${target.slug} for ${c.slug} not in DB`);
      continue;
    }

    const prices = await prisma.price.findMany({
      where: { commodityId: c.id },
      orderBy: { updatedAt: 'desc' },
    });
    for (const p of prices) {
      // Only LIVE prices on the target conflict — archived ones are audit
      // history and don't participate in the unique index (partial WHERE
      // archivedAt IS NULL).
      const conflict = await prisma.price.findFirst({
        where: {
          commodityId: targetId,
          sourceId: p.sourceId,
          date: p.date,
          origin: target.origin,
          archivedAt: null,
          NOT: { id: p.id },
        },
      });
      if (conflict) {
        // Archive AND repoint commodityId to the target. If we left
        // commodityId pointing at the legacy commodity, the later
        // commodity.delete would hit a FK violation.
        if (!dry) {
          await prisma.price.update({
            where: { id: p.id },
            data: {
              commodityId: targetId,
              origin: target.origin,
              archivedAt: new Date(),
              archivedReason: `superseded by canonical ${target.slug} (origin=${target.origin ?? 'null'}) during unification`,
            },
          });
        }
        report.pricesArchivedAsLoser++;
      } else {
        if (!dry) {
          await prisma.price.update({
            where: { id: p.id },
            data: { commodityId: targetId, origin: target.origin },
          });
        }
        report.pricesRepointed++;
      }
    }

    const alertCount = await prisma.alert.count({ where: { commodityId: c.id } });
    if (alertCount > 0) {
      if (!dry) {
        await prisma.alert.updateMany({
          where: { commodityId: c.id },
          data: { commodityId: targetId },
        });
      }
      report.alertsRepointed += alertCount;
    }

    const watches = await prisma.watchlist.findMany({ where: { commodityId: c.id } });
    for (const w of watches) {
      const dupe = await prisma.watchlist.findFirst({
        where: { userId: w.userId, commodityId: targetId },
      });
      if (dupe) {
        if (!dry) await prisma.watchlist.delete({ where: { id: w.id } });
        report.watchlistsDeleted++;
      } else {
        if (!dry) {
          await prisma.watchlist.update({
            where: { id: w.id },
            data: { commodityId: targetId },
          });
        }
        report.watchlistsRepointed++;
      }
    }

    if (!dry) {
      const remaining = await prisma.price.count({
        where: { commodityId: c.id, archivedAt: null },
      });
      if (remaining === 0) {
        await prisma.commodity.delete({ where: { id: c.id } });
        report.legacyDeleted.push(c.slug);
      } else {
        report.errors.push(`legacy ${c.slug} has ${remaining} live prices remaining; not deleted`);
      }
    } else {
      report.legacyDeleted.push(c.slug);
    }
  }

  return report;
}
