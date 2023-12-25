'use client';

import { useState } from 'react';
import { en, Translations } from '.';

export function useTranslation<T extends keyof Translations['pages'] | undefined = undefined>(
	page?: T
): T extends undefined
	? { trans: Translations }
	: { trans: Translations['pages'][T & string]; translations: Translations } {
	const [trans] = useState<Translations>(en);

	return {
		trans: page ? trans['pages'][page] : trans,
		translations: trans
	} as any;
}
