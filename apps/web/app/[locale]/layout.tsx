'use client';

import clsx from 'clsx';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { RecoilRoot } from 'recoil';

const locales = ['en', 'de', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es', 'fr'];

const inter = Inter({ subsets: ['latin'] });

type Props = {
	children: ReactNode;
	params: { locale: string };
};

// export function generateStaticParams() {
// 	return locales.map((locale: any) => ({ locale }));
// }

// export async function generateMetadata({ params: { locale } }: Omit<Props, 'children'>) {
// 	const t = await getTranslations({ locale, namespace: 'LocaleLayout' });

// 	return {
// 		title: t('title')
// 	};
// }

export default function LocaleLayout({ children, params: { locale } }: Props) {
	// Validate that the incoming `locale` parameter is valid
	if (!locales.includes(locale as any)) notFound();

	// Enable static rendering
	// unstable_setRequestLocale(locale);

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const messages = require(`../../messages/${locale}.json`);
	return (
		<html className="h-full" lang={locale}>
			<NextIntlClientProvider locale={locale} messages={messages} timeZone={'Asia/Kolkata'}>
				<body className={clsx(inter.className, 'flex h-full flex-col')}>
					<RecoilRoot>{children}</RecoilRoot>
				</body>
			</NextIntlClientProvider>
		</html>
	);
}
