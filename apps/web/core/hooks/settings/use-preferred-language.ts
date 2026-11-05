'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useSettings } from '@/core/hooks/users/use-settings';
import { useLanguage } from '@/core/hooks/common/use-language';
import { useLanguageSettings } from '@/core/hooks/common/use-language-settings';
import { setActiveLanguageIdCookie } from '@/core/lib/helpers/cookies';

const PREFERENCES_PATH = '/settings/personal/preferences';

export function usePreferredLanguage() {
	const locale = useLocale();
	const router = useRouter();
	const { data: user } = useUserQuery();
	const { updateAvatar } = useSettings();
	const { changeLanguage } = useLanguage();
	const { languages, loading, languagesFetching, setActiveLanguage, isError, refetch } = useLanguageSettings();
	const userId = user?.id;
	const storedLanguage = user?.preferredLanguage;

	const changeTo = useCallback(
		(code: string) => {
			const language = languages.find((item) => item.code === code);
			if (!language) {
				return;
			}
			setActiveLanguageIdCookie(code);
			changeLanguage(code);
			const differs = storedLanguage !== code;
			if (userId && differs) {
				updateAvatar({ preferredLanguage: code, id: userId }).catch(() => undefined);
			}
			setActiveLanguage(language);
			router.replace(`/${code}${PREFERENCES_PATH}`);
		},
		[changeLanguage, languages, router, setActiveLanguage, storedLanguage, updateAvatar, userId]
	);

	const isLoading = loading || languagesFetching;

	const retry = useCallback(() => {
		void refetch();
	}, [refetch]);

	return {
		currentCode: locale,
		languages,
		isLoading,
		isError,
		retry,
		changeTo
	};
}
