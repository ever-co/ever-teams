'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingsRow } from '@/core/components/settings/kit/settings-page';
import { usePreferredLanguage } from '@/core/hooks/settings/use-preferred-language';
import { cn } from '@/core/lib/helpers';

const CONTROL_WIDTH = 'w-full sm:w-48';

export function LanguageRow() {
	const t = useTranslations();
	const triggerId = useId();
	const { currentCode, languages, isLoading, isError, retry, changeTo } = usePreferredLanguage();
	const hasLanguages = languages.length > 0;
	const current = languages.find((language) => language.code === currentCode);
	const currentName = current?.name ?? currentCode;
	const showsSkeleton = isLoading && !hasLanguages;
	const showsError = isError && !hasLanguages;
	const showsEmpty = !isLoading && !isError && !hasLanguages;

	let control = (
		<Select value={currentCode} onValueChange={changeTo}>
			<SelectTrigger id={triggerId} className={cn('h-8 text-[13px]', CONTROL_WIDTH)}>
				<SelectValue>{currentName}</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{languages.map((language) => (
					<SelectItem key={language.code} value={language.code} className="text-[13px]">
						{language.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
	if (showsSkeleton) {
		control = (
			<span
				aria-hidden="true"
				className={cn('flex h-8 items-center rounded-md px-2.5 hairline-ring ring-border', CONTROL_WIDTH)}
			>
				<span className="h-2.5 w-20 animate-pulse rounded-full bg-foreground/[0.07]" />
			</span>
		);
	}
	if (showsError) {
		control = (
			<span role="alert" className="flex items-center gap-2 text-xs text-destructive-ink">
				{t('settings.preferences.LANGUAGE_LOAD_FAILED')}
				<Button type="button" variant="outline" size="sm" onClick={retry}>
					{t('notifications.RETRY')}
				</Button>
			</span>
		);
	}
	if (showsEmpty) {
		control = <span className="text-[13px] text-muted-foreground">{t('settings.preferences.LANGUAGE_EMPTY')}</span>;
	}

	return (
		<SettingsRow
			label={t('settings.preferences.LANGUAGE')}
			description={t('settings.preferences.LANGUAGE_DESCRIPTION')}
			htmlFor={triggerId}
		>
			{control}
		</SettingsRow>
	);
}
