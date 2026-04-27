'use client';

import * as React from 'react';
import { Button } from '@makayeel/ui';

export function LinkCodeCard({
  code,
  botHandle,
  copyCta,
  copiedText,
}: {
  code: string;
  botHandle: string;
  copyCta: string;
  copiedText: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const command = `/link ${code}`;

  async function onCopy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
      <p className="mb-2 text-xs text-navy-200">Telegram</p>
      <p className="mb-4 font-mono text-sm text-deep-navy" dir="ltr">{botHandle}</p>

      <div className="mb-4 rounded-xl bg-cream p-4 text-center">
        <p className="font-mono text-2xl font-semibold tracking-wider text-deep-navy" dir="ltr">
          {command}
        </p>
      </div>

      <Button onClick={onCopy} className="w-full" variant="ghost">
        {copied ? copiedText : copyCta}
      </Button>
    </div>
  );
}
