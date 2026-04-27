import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  EMAIL_SERVER: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().email().default('admin@makayeel.com'),
  CRON_SECRET: z.string().min(8),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function parseEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.flatten().fieldErrors;
    console.error('❌ Invalid environment variables:', missing);
    throw new Error(
      'Invalid environment — fix the errors above. See .env.example for all required vars.',
    );
  }
  return parsed.data;
}

export const env = parseEnv();
