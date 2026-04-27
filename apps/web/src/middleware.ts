import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createIntlMiddleware(routing);

export const config = {
  // Match everything except assets, API, and static files.
  // `/api/*` is intentionally excluded so locale prefixes don't leak into API paths.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
