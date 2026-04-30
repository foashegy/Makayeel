import type { Context, SessionFlavor } from 'grammy';
import type { Locale } from '@makayeel/i18n';
import { prisma } from '@makayeel/db';

export interface PendingExtraction {
  prices: { commoditySlug: string; value: number; confidence: 'high' | 'medium' | 'low' }[];
  sourceLabel: string | null;
  sourceSlug: string | null;
  sourceType: 'PORT' | 'WHOLESALER' | 'EXCHANGE' | 'FACTORY' | null;
  createdAt: number;
}

export interface BotSession {
  locale: Locale;
  pendingExtraction?: PendingExtraction;
}

export type BotContext = Context & SessionFlavor<BotSession>;

export function initSession(): BotSession {
  return { locale: 'ar' };
}

/** Persist the user's locale choice to their account if they're linked. */
export async function persistLocale(chatId: string | number, locale: Locale) {
  const link = await prisma.botLink.findUnique({
    where: { telegramChatId: String(chatId) },
  });
  if (link) {
    await prisma.user.update({ where: { id: link.userId }, data: { locale } });
  }
}
