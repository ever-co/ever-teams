import { ILanguageItemList } from '@/core/types/interfaces/language/language';
import { atom } from 'jotai';

export const languageListState = atom<ILanguageItemList[]>([]);

export const activeLanguageIdState = atom<string | null>(null);

export const languagesFetchingState = atom<boolean>(false);

export const activeLanguageState = atom<ILanguageItemList | null>((get) => {
	const languages = get(languageListState);
	const activeId = get(activeLanguageIdState);
	return languages.find((language) => language.code === activeId) || languages[0] || null;
});
export const currentLanguageState = atom('en');
