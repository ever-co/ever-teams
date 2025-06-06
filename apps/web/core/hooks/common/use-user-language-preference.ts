import { TUser } from '@/core/types/schemas';
import { useEffect } from 'react';

/**
 * Custom hook to handle user language preferences
 * @param user - Current user object
 * @param changeLanguage - Function to change language
 */
export const useUserLanguagePreference = (user: TUser | null, changeLanguage: (lang: string) => void) => {
	useEffect(() => {
		const language = (user?.preferredLanguage || window?.localStorage?.getItem('preferredLanguage')) ?? null;
		if (language) {
			changeLanguage(language);
		}
	}, [changeLanguage, user]);
};
