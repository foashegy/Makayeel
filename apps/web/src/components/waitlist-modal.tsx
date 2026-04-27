'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Button,
} from '@makayeel/ui';
import type { Locale } from '@makayeel/i18n';

export function WaitlistModal({
  trigger,
  locale,
  waitlistCopy,
}: {
  trigger: React.ReactNode;
  locale: Locale;
  waitlistCopy: string;
}) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/v1/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, locale, source: 'pricing-page' }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{locale === 'ar' ? 'قريبًا — Pro' : 'Pro is coming soon'}</DialogTitle>
          <DialogDescription>{waitlistCopy}</DialogDescription>
        </DialogHeader>
        {status === 'success' ? (
          <p className="rounded-lg bg-harvest-green/10 p-3 text-sm text-harvest-green">
            {locale === 'ar'
              ? 'اتسجلت! هنبعتلك أول ما نفتح الاشتراكات.'
              : "You're on the list! We'll email you when Pro launches."}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="waitlist-email">
                {locale === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
              </Label>
              <Input
                id="waitlist-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            {status === 'error' && (
              <p className="text-sm text-alert-red">
                {locale === 'ar' ? 'في خطأ حصل — جرّب تاني.' : 'Something went wrong — retry.'}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={status === 'loading'}>
                {status === 'loading'
                  ? locale === 'ar' ? 'جاري الإرسال…' : 'Sending…'
                  : locale === 'ar' ? 'سجلني' : 'Notify me'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
