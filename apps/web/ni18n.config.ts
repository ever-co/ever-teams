/* eslint-disable @typescript-eslint/no-var-requires */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
const supportedLngs = ['en', 'fr', 'ar', 'bg', 'zh', 'nl', 'de', 'he', 'it', 'pl', 'pt', 'ru', 'es'];

i18n.use(initReactI18next).init({
	lng: 'en',
	fallbackLng: 'en',
	ns: ['common'],
	defaultNS: 'common',
	supportedLngs,
	interpolation: {
		escapeValue: false
	}
});

supportedLngs.forEach((lang) => {
	i18n.addResourceBundle(lang, 'common', require(`/public/locales/${lang}/common.json`));
});

export default i18n;
