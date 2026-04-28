import type { BotContext } from '../lib/locale';
import { getLinkedUser } from '../lib/queries';
import { fmtNum, mdEscape } from '../lib/format';
import { computeUserFormulaCosts } from '../lib/formula-cost';

export async function costHandler(ctx: BotContext) {
  const locale = ctx.session.locale;
  const chatId = ctx.chat?.id?.toString();
  if (!chatId) return;

  let user: Awaited<ReturnType<typeof getLinkedUser>>;
  try {
    user = await getLinkedUser(chatId);
  } catch (err) {
    console.error('cost: getLinkedUser failed:', err);
    await ctx.reply(
      locale === 'ar'
        ? 'فيه مشكلة في الاتصال بالقاعدة. حاول كمان شوية.'
        : 'Database error. Please try again shortly.',
    );
    return;
  }

  if (!user) {
    await ctx.reply(
      locale === 'ar'
        ? 'لازم تربط حسابك الأول. ابعت /link.'
        : 'Link your account first with /link.',
    );
    return;
  }

  let results: Awaited<ReturnType<typeof computeUserFormulaCosts>>;
  try {
    results = await computeUserFormulaCosts(user.id);
  } catch (err) {
    console.error('cost: computeUserFormulaCosts failed:', err);
    await ctx.reply(
      locale === 'ar'
        ? 'مش قادر أحسب تكلفة وصفاتك دلوقتي. حاول كمان شوية.'
        : "Couldn't compute your formula costs right now. Please try again shortly.",
    );
    return;
  }
  if (results.length === 0) {
    // Plain text — no markdown needed and `.` would break MarkdownV2.
    await ctx.reply(
      locale === 'ar'
        ? 'مفيش وصفات محفوظة. ادخل اللوحة واحفظ خلطتك من /dashboard/cost.'
        : 'No saved formulas. Save one from /dashboard/cost on the web app.',
    );
    return;
  }

  const title = locale === 'ar' ? '*تكلفة وصفاتك النهاردة*' : '*Your formulas — today*';
  const lines: string[] = [title, ''];

  for (const r of results) {
    const cost = fmtNum(Math.round(r.costPerTonToday), locale);
    const unit = locale === 'ar' ? 'ج/طن' : 'EGP/ton';
    let deltaStr = '';
    if (r.deltaPct !== null) {
      if (Math.abs(r.deltaPct) < 0.05) {
        deltaStr = ` • ${locale === 'ar' ? 'بدون تغيير' : 'unchanged'}`;
      } else {
        const arrow = r.deltaPct > 0 ? '▲' : '▼';
        deltaStr = ` ${arrow} ${Math.abs(r.deltaPct).toFixed(1)}%`;
      }
    }
    const missingPlain =
      r.missingSlugs.length > 0
        ? locale === 'ar'
          ? `(${r.missingSlugs.length} خامة بدون سعر اليوم)`
          : `(${r.missingSlugs.length} commodities missing today)`
        : '';
    const missingNote = missingPlain ? ` _${mdEscape(missingPlain)}_` : '';
    lines.push(
      `*${mdEscape(r.formulaName)}* — ${mdEscape(cost)} ${mdEscape(unit)}${mdEscape(deltaStr)}${missingNote}`,
    );
  }

  await ctx.reply(lines.join('\n'), { parse_mode: 'MarkdownV2' });
}
