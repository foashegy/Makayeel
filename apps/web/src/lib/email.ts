import type { Locale } from '@makayeel/i18n';

interface AlertPayload {
  commodityNameAr: string;
  commodityNameEn: string;
  price: number;
  threshold: number;
  direction: 'ABOVE' | 'BELOW';
  unit: string;
}

/**
 * Send a single price-alert email. Uses Resend if RESEND_API_KEY is set,
 * otherwise no-ops (logs) so local dev doesn't require SMTP.
 */
export async function sendAlertEmail(
  to: string,
  locale: Locale,
  payload: AlertPayload,
): Promise<void> {
  const name = locale === 'ar' ? payload.commodityNameAr : payload.commodityNameEn;
  const dir = payload.direction === 'ABOVE'
    ? (locale === 'ar' ? 'تعدى' : 'crossed above')
    : (locale === 'ar' ? 'نزل تحت' : 'crossed below');

  const subject = locale === 'ar'
    ? `تنبيه سعر ${name}`
    : `Price alert: ${name}`;

  const bodyHtml = locale === 'ar'
    ? `<p dir="rtl" style="font-family:Tajawal,sans-serif">
         <strong>${name}</strong> ${dir} ${payload.threshold.toLocaleString('ar-EG')} ${payload.unit}.<br/>
         السعر الحالي: <strong>${payload.price.toLocaleString('ar-EG')} ${payload.unit}</strong>.
       </p>`
    : `<p style="font-family:Inter,sans-serif">
         <strong>${name}</strong> ${dir} ${payload.threshold.toLocaleString('en-US')} ${payload.unit}.<br/>
         Current price: <strong>${payload.price.toLocaleString('en-US')} ${payload.unit}</strong>.
       </p>`;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Makayeel <no-reply@makayeel.com>';

  if (!apiKey) {
    console.info(`[email:DEV] would send to ${to}: ${subject}`);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, html: bodyHtml });
  if ('error' in result && result.error) {
    console.error('Email send failed:', result.error);
    throw new Error(`email_send_failed: ${result.error.message ?? 'unknown'}`);
  }
}
