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

declare module 'react-i18next' {
	export interface I18n {
		changeLanguage: (language: string) => Promise<void>;

		loadNamespaces: (namespace: string) => Promise<void>;
	}
}
