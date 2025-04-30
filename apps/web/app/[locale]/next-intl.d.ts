import { Languages } from '../../core/constants/config/constants';

declare module 'next-intl' {
	export type Translations = Languages;
	type PathsToStringProps<T> = T extends string
		? []
		: { [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>] }[Extract<keyof T, string>];

	type Join<T extends string[], D extends string> = T extends []
		? never
		: T extends [infer F]
			? F
			: T extends [infer F, ...infer R]
				? F extends string
					? `${F}${D}${Join<Extract<R, string[]>, D>}`
					: never
				: string;

	export type DottedLanguageObjectStringPaths = Join<PathsToStringProps<Translations>, '.'>;
	export type TranslationHooks = (
		key: DottedLanguageObjectStringPaths,
		value?: any
	) => DottedLanguageObjectStringPaths;
	export const useTranslations: () => TranslationHooks;
}
