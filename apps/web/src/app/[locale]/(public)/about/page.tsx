import { isLocale, type Locale } from '@makayeel/i18n';
import { notFound } from 'next/navigation';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose prose-stone">
      {locale === 'ar' ? <AboutAr /> : <AboutEn />}
    </article>
  );
}

function AboutAr() {
  return (
    <>
      <h1 className="text-3xl font-medium text-deep-navy">عن مكاييل</h1>
      <p className="text-charcoal/80">
        مكاييل اتبنيت علشان حاجة واحدة: كل تاجر ومربي في مصر يقدر يشوف أسعار خامات الأعلاف
        الصح، قبل ما يتصل بالمورد. بنجمع أسعار الذرة، فول الصويا، النخالة، الشعير، وباقي
        الخامات من موانئ الإسكندرية ودمياط، ومن تجار الجملة في القاهرة والسادات — ونعرضها
        في جدول واحد محدّث يومي الساعة ٧ الصبح.
      </p>
      <h2 className="mt-8 text-xl font-medium text-deep-navy">مين وراء مكاييل؟</h2>
      <p className="text-charcoal/80">
        منتج من <strong>ATEN STUDIO</strong>، وكيل رقمي لقطاع الزراعة والأعلاف في مصر.
        بنشتغل من القاهرة ومدينة السادات، بخبرة أكتر من ٢٥ سنة في قطاع الأعلاف.
      </p>
      <h2 className="mt-8 text-xl font-medium text-deep-navy">تواصل</h2>
      <p className="text-charcoal/80">
        واتساب: <span className="ltr mono">+20 155 500 1688</span>
        <br />
        اتصال: <span className="ltr mono">+20 122 220 3810</span>
        <br />
        بريد: <span className="ltr">hello@makayeel.com</span>
      </p>
    </>
  );
}

function AboutEn() {
  return (
    <>
      <h1 className="text-3xl font-medium text-deep-navy">About Makayeel</h1>
      <p className="text-charcoal/80">
        Makayeel exists for one reason: every trader and farmer in Egypt should be able to
        see the right feed-commodity price before calling the supplier. We aggregate prices
        for corn, soybean meal, wheat bran, barley, and other raw materials from the ports
        of Alexandria and Damietta, and from wholesale markets in Cairo and Sadat City —
        publishing them in a single daily table at 7 AM Cairo time.
      </p>
      <h2 className="mt-8 text-xl font-medium text-deep-navy">Who's behind Makayeel?</h2>
      <p className="text-charcoal/80">
        A product of <strong>ATEN STUDIO</strong>, a digital agency for Egypt's feed and
        agriculture sector. Built in Cairo and Sadat City, drawing on 25+ years of
        commodity-trade experience.
      </p>
      <h2 className="mt-8 text-xl font-medium text-deep-navy">Contact</h2>
      <p className="text-charcoal/80">
        WhatsApp: <span className="mono">+20 155 500 1688</span>
        <br />
        Phone: <span className="mono">+20 122 220 3810</span>
        <br />
        Email: hello@makayeel.com
      </p>
    </>
  );
}
