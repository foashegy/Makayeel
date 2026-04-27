'use client';

// Stub — dark mode is out of scope for MVP but the toggle shape is reserved
// so we don't have to retrofit the header layout later.

import * as React from 'react';
import { Sun } from 'lucide-react';

export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Theme toggle (dark mode coming later)"
      disabled
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-navy/15 text-navy-300 opacity-50"
      title="Dark mode is on the Phase 2 roadmap."
    >
      <Sun className="h-4 w-4" />
    </button>
  );
}
