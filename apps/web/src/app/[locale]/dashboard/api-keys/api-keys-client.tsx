'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, formatDate } from '@makayeel/ui';
import type { Locale } from '@makayeel/i18n';

interface Key {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface Props {
  locale: Locale;
  initialKeys: Key[];
  labels: {
    new: string;
    nameLabel: string;
    create: string;
    copyWarning: string;
    prefix: string;
    lastUsed: string;
    revoke: string;
    empty: string;
  };
}

export function ApiKeysClient({ locale, initialKeys, labels }: Props) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [newKey, setNewKey] = React.useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    const res = await fetch('/api/v1/api-keys', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const body = (await res.json()) as { data: { key: string } };
      setNewKey(body.data.key);
      setName('');
      router.refresh();
    }
  }

  async function onRevoke(id: string) {
    await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        {newKey && (
          <div className="mb-4 rounded-xl border border-wheat-gold bg-brand-50 p-4">
            <p className="mb-2 text-sm font-medium text-deep-navy">⚠️ {labels.copyWarning}</p>
            <code className="block break-all rounded bg-white p-3 font-mono text-xs text-charcoal">
              {newKey}
            </code>
          </div>
        )}

        {initialKeys.length === 0 ? (
          <div className="rounded-xl border border-navy/8 bg-white p-8 text-center text-navy-200">
            {labels.empty}
          </div>
        ) : (
          <ul className="space-y-2">
            {initialKeys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-xl border border-navy/8 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-deep-navy">{k.name}</p>
                  <p className="mt-1 font-mono text-xs text-navy-200">{k.prefix}…</p>
                  <p className="text-xs text-navy-200">
                    {labels.lastUsed}:{' '}
                    {k.lastUsedAt ? formatDate(k.lastUsedAt, locale) : '—'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRevoke(k.id)}>
                  {labels.revoke}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onCreate} className="h-fit rounded-2xl border border-navy/8 bg-white p-5">
        <h3 className="mb-4 font-medium text-deep-navy">{labels.new}</h3>
        <div className="mb-4 space-y-1.5">
          <Label htmlFor="key-name">{labels.nameLabel}</Label>
          <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full">
          {labels.create}
        </Button>
      </form>
    </div>
  );
}
