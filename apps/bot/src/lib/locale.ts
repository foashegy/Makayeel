import type { Context, SessionFlavor } from 'grammy';
import type { Locale } from '@makayeel/i18n';
import { prisma } from '@makayeel/db';

export interface PendingExtraction {
  /** Unique id (telegram message_id of the prompt) — included in callback_data
   * so a confirm always applies to the photo it was generated for, even if a
   * second photo arrived in between. */
  id: number;
  prices: { commoditySlug: string; value: number; confidence: 'high' | 'medium' | 'low' }[];
  sourceLabel: string | null;
  sourceSlug: string | null;
  sourceType: 'PORT' | 'WHOLESALER' | 'EXCHANGE' | 'FACTORY' | null;
  createdAt: number;
}

export interface PendingMillSubmission {
  /** Same correlation pattern as PendingExtraction. */
  id: number;
  prices: { commoditySlug: string; value: number; confidence: 'high' | 'medium' | 'low' }[];
  /** The mill source slug we'll write under — namespaced as mill-{userId} so
   * different mills don't collide. Auto-created on first submission. */
  millSourceSlug: string;
  millLabel: string;
  createdAt: number;
}

export interface BotSession {
  locale: Locale;
  pendingExtraction?: PendingExtraction;
  pendingSubmission?: PendingMillSubmission;
  /** Track when we last accepted a /عرض submission (epoch ms). Used to apply
   * a soft rate limit so a single mill can't drown the table in 1 day. */
  lastSubmissionAt?: number;
  /** True if the user explicitly opened submission mode via /عرض — the very
   * next photo is treated as a mill quote, not an admin extraction. */
  awaitingMillPhoto?: boolean;
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
