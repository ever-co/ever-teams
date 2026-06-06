'use client';

import { useTransition } from 'react';
import { Locale } from '@/lib/i18n/i18nNavigation';
import { setUserLocale } from '@/lib/i18n/locale';
import { Select } from '@ever-teams/toolkit-ui';
import { changeTeamsLanguage } from '@ever-teams/atoms';
import { useLocale, useTranslations } from 'next-intl';
import { languages } from '@/lib/i18n/i18nNavigation';
import { JSX, useMemo } from 'react';

export const LanguageSwitcher = (): JSX.Element => {
	const [isPending, startTransition] = useTransition();
	const t = useTranslations('Navigation');
	const locale = useLocale();

	const languageOptions = useMemo(
		() =>
			languages.map((lang) => ({
				label: lang.name,
				value: lang.code,
				icon: lang.flag
			})),
		[]
	);

	function onChange(value: string) {
		const locale = value as Locale;
		startTransition(() => {
			setUserLocale(locale);
			// Update Teams components language
			changeTeamsLanguage(locale);
		});
	}

	return (
		<div className="flex items-center gap-2">
			<Select
				placeholder={t('language')}
				values={languageOptions}
				value={locale}
				onValueChange={onChange}
				className="min-w-[140px] text-sm border-slate-300 dark:border-slate-600"
				disabled={isPending}
				loading={isPending}
			/>
		</div>
	);
};
