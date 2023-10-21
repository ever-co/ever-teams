import en from '../public/locales/en/default.json';

declare module 'i18next' {
	interface CustomTypeOptions {
		returnNull: false;
		defaultNS: 'default';
		resources: {
			default: typeof en;
		};
	}
}
