'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  formatPrice,
} from '@makayeel/ui';
import type { Locale } from '@makayeel/i18n';

interface Alert {
  id: string;
  commoditySlug: string;
  commodityNameAr: string;
  commodityNameEn: string;
  threshold: number;
  direction: 'ABOVE' | 'BELOW';
  channel: 'EMAIL' | 'TELEGRAM' | 'BOTH';
  isActive: boolean;
}

interface Props {
  locale: Locale;
  telegramLinked: boolean;
  initialAlerts: Alert[];
  commodities: { slug: string; nameAr: string; nameEn: string }[];
  labels: {
    new: string;
    selectCommodity: string;
    thresholdLabel: string;
    direction: string;
    above: string;
    below: string;
    channel: string;
    email: string;
    telegram: string;
    both: string;
    save: string;
    delete: string;
    empty: string;
    telegramDisabled: string;
    activeBadge: string;
  };
}

export function AlertsClient({
  locale,
  telegramLinked,
  initialAlerts,
  commodities,
  labels,
}: Props) {
  const router = useRouter();
  const [commoditySlug, setCommoditySlug] = React.useState(commodities[0]?.slug ?? '');
  const [threshold, setThreshold] = React.useState('');
  const [direction, setDirection] = React.useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [channel, setChannel] = React.useState<'EMAIL' | 'TELEGRAM' | 'BOTH'>('EMAIL');
  const [loading, setLoading] = React.useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const t = Number(threshold);
    if (!t || t <= 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ commoditySlug, threshold: t, direction, channel }),
      });
      if (res.ok) {
        setThreshold('');
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    await fetch(`/api/v1/alerts/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        {initialAlerts.length === 0 ? (
          <div className="rounded-xl border border-navy/8 bg-white p-8 text-center text-navy-200">
            {labels.empty}
          </div>
        ) : (
          <ul className="space-y-2">
            {initialAlerts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-navy/8 bg-white p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-deep-navy">
                      {locale === 'ar' ? a.commodityNameAr : a.commodityNameEn}
                    </span>
                    {a.isActive && (
                      <span className="rounded-full bg-harvest-green/12 px-2 py-0.5 text-xs text-harvest-green">
                        {labels.activeBadge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-navy-200">
                    {a.direction === 'ABOVE' ? labels.above : labels.below} {formatPrice(a.threshold, locale)} · {a.channel === 'EMAIL' ? labels.email : a.channel === 'TELEGRAM' ? labels.telegram : labels.both}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDelete(a.id)}>
                  {labels.delete}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onSave} className="h-fit rounded-2xl border border-navy/8 bg-white p-5">
        <h3 className="mb-4 font-medium text-deep-navy">{labels.new}</h3>

        <div className="mb-3 space-y-1.5">
          <Label>{labels.selectCommodity}</Label>
          <Select value={commoditySlug} onValueChange={setCommoditySlug}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {commodities.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {locale === 'ar' ? c.nameAr : c.nameEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-3 space-y-1.5">
          <Label>{labels.thresholdLabel}</Label>
          <Input
            type="number"
            min={0}
            step={25}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            required
          />
        </div>

        <div className="mb-3 space-y-1.5">
          <Label>{labels.direction}</Label>
          <Select value={direction} onValueChange={(v) => setDirection(v as 'ABOVE' | 'BELOW')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ABOVE">{labels.above}</SelectItem>
              <SelectItem value="BELOW">{labels.below}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mb-4 space-y-1.5">
          <Label>{labels.channel}</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as Alert['channel'])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">{labels.email}</SelectItem>
              <SelectItem value="TELEGRAM" disabled={!telegramLinked}>
                {labels.telegram}
              </SelectItem>
              <SelectItem value="BOTH" disabled={!telegramLinked}>
                {labels.both}
              </SelectItem>
            </SelectContent>
          </Select>
          {!telegramLinked && (
            <p className="text-xs text-navy-200">{labels.telegramDisabled}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {labels.save}
        </Button>
      </form>
    </div>
  );
}
