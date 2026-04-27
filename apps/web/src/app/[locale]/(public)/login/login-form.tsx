'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@makayeel/ui';
import type { Locale } from '@makayeel/i18n';

export function LoginForm({ locale }: { locale: Locale }) {
  const t = useTranslations('auth');
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function onEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await signIn('nodemailer', {
        email,
        callbackUrl: `/${locale}/dashboard`,
        redirect: true,
      });
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleClick() {
    setLoading(true);
    try {
      await signIn('google', { callbackUrl: `/${locale}/dashboard` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onEmailSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
            autoComplete="email"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {t('sendLink')}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-navy-200">
        <span className="h-px flex-1 bg-navy/10" />
        {t('orContinueWith')}
        <span className="h-px flex-1 bg-navy/10" />
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onGoogleClick}
        disabled={loading}
      >
        {t('google')}
      </Button>
    </>
  );
}
