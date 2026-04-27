// Root layout — per Next 15 App Router, the locale-aware shell lives in
// src/app/[locale]/layout.tsx. This file just renders the children straight
// through so middleware can redirect `/` → `/ar`.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export { metadata } from './metadata';
