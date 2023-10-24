/* eslint-disable @typescript-eslint/no-var-requires */
/**@type import('next-i18next').UserConfig */
module.exports = {
	debug: process.env.NODE_ENV === 'development',
	i18n: {
		locales: ['en', 'fr', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es'],
		defaultLocale: 'en'
	},
	/** To avoid issues when deploying to some paas (vercel...) */
	localePath: typeof window === 'undefined' ? require('path').resolve('./public/locales') : '/locales',
	reloadOnPrerender: process.env.NODE_ENV === 'development'
};
