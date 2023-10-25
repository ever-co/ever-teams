/* eslint-disable @typescript-eslint/no-var-requires */
const isDev = process.env.NODE_ENV === 'development';
/**@type import('react-i18next').UserConfig */
module.exports = {
	debug: isDev,
	i18n: {
		locales: ['en', 'fr', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es'],
		defaultLocale: 'en'
	},
	defaultNS: 'common',
	ns: ['common'],
	/** To avoid issues when deploying*/
	localePath: typeof window === 'undefined' ? require('path').resolve('./public/locales') : '/locales',
	reloadOnPrerender: true
};
