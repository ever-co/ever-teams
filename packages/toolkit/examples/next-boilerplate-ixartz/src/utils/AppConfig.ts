import { LocalePrefixMode } from 'next-intl/routing';

const localePrefix: LocalePrefixMode = 'as-needed';

// FIXME: Update this configuration file based on your project information
export const AppConfig = {
	name: 'Ever Teams Nextjs Starter ',
	locales: ['en', 'fr'],
	defaultLocale: 'en',
	localePrefix
};
