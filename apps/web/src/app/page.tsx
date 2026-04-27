import { redirect } from 'next/navigation';
import { defaultLocale } from '@makayeel/i18n';

export default function RootIndex() {
  redirect(`/${defaultLocale}`);
}
