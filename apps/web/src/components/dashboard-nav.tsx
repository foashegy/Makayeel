'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@makayeel/i18n';

interface NavItem {
  href: string;
  label: string;
  matchPrefix: string;
  emphasis?: 'default' | 'admin';
}

export default function DashboardNav({
  locale,
  isAdmin,
  dashboardLabel,
  adminLabel,
}: {
  locale: Locale;
  isAdmin: boolean;
  dashboardLabel: string;
  adminLabel: string;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      href: `/${locale}/dashboard`,
      label: dashboardLabel,
      matchPrefix: `/${locale}/dashboard`,
    },
    {
      href: `/${locale}/dashboard/cost`,
      label: locale === 'ar' ? 'التكلفة' : 'Cost',
      matchPrefix: `/${locale}/dashboard/cost`,
    },
    {
      href: `/${locale}/dashboard/alerts`,
      label: locale === 'ar' ? 'التنبيهات' : 'Alerts',
      matchPrefix: `/${locale}/dashboard/alerts`,
    },
    {
      href: `/${locale}/dashboard/api-keys`,
      label: 'API',
      matchPrefix: `/${locale}/dashboard/api-keys`,
    },
    {
      href: `/${locale}/dashboard/settings`,
      label: locale === 'ar' ? 'الإعدادات' : 'Settings',
      matchPrefix: `/${locale}/dashboard/settings`,
    },
  ];

  if (isAdmin) {
    items.push({
      href: `/${locale}/admin/prices`,
      label: adminLabel,
      matchPrefix: `/${locale}/admin`,
      emphasis: 'admin',
    });
  }

  // Match the most specific prefix (e.g. /dashboard/cost wins over /dashboard).
  let activeHref: string | null = null;
  let bestLen = 0;
  for (const it of items) {
    if (
      (pathname === it.matchPrefix || pathname.startsWith(it.matchPrefix + '/')) &&
      it.matchPrefix.length > bestLen
    ) {
      activeHref = it.href;
      bestLen = it.matchPrefix.length;
    }
  }

  return (
    <nav className="hidden items-center gap-6 md:flex">
      {items.map((it) => {
        const active = activeHref === it.href;
        const base = it.emphasis === 'admin' ? 'text-wheat-gold' : 'text-deep-navy';
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`text-sm transition ${base} ${
              active
                ? 'font-medium underline decoration-wheat-gold decoration-2 underline-offset-[6px]'
                : 'hover:opacity-70'
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
