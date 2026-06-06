// Configuration for supported locales without routing
export const locales = ['en', 'fr'] as const;
export const defaultLocale: Locale = 'en';

export type Locale = (typeof locales)[number];

// Language configuration
export const languages = [
	{
		code: 'en' as const,
		name: 'English',
		flag: '🇺🇸'
	},
	{
		code: 'fr' as const,
		name: 'Français',
		flag: '🇫🇷'
	}
] as const;
