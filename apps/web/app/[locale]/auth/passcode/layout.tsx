'use client';

import { notFound } from 'next/navigation';
import { RecoilRoot } from 'recoil';

// Can be imported from a shared config
const locales = ['en', 'de'];

export default function LocaleLayout({ children, params: { locale } }: any) {
	// Validate that the incoming `locale` parameter is valid
	if (!locales.includes(locale as any)) notFound();

	return (
		<html lang={locale}>
			<body>
				<RecoilRoot>{children}</RecoilRoot>
			</body>
		</html>
	);
}
