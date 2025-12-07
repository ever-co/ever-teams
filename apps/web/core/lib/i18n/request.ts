import { Locale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }: { locale?: Locale }) => {
	const safeLocale = locale ?? 'en'; // <-- Fix typescript + next-intl

	return {
		locale: safeLocale,
		messages: (await import(`../../locales/${safeLocale}.json`)).default
	};
});
