'use client';

import moment from 'moment';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { RecoilRoot } from 'recoil';

// Can be imported from a shared config
const locales = ['en', 'de', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es', 'fr'];

export default function LocaleLayout({ children, params: { locale } }: any) {
	// Validate that the incoming `locale` parameter is valid
	if (!locales.includes(locale as any)) notFound();

	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const messages = require(`../../messages/${locale}.json`);

	return (
		<html lang={locale}>
			<body>
				<NextIntlClientProvider locale={locale} messages={messages} timeZone={moment().tz()}>
					<RecoilRoot>{children}</RecoilRoot>
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
