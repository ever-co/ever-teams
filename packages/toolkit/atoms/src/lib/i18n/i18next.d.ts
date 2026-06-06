// import the original type declarations
import 'i18next';
// import all namespaces (for the default language, only)
import ns1 from './locales/en.json';
import ns2 from './locales/fr.json';

declare module 'i18next' {
	// Extend CustomTypeOptions
	interface CustomTypeOptions {
		// custom namespace type, if you changed it
		defaultNS: 'ns1';
		// custom resources type
		resources: {
			ns1: typeof ns1;
			ns2: typeof ns2;
		};
		// other
	}
}
