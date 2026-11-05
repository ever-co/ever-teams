'use client';

import { useId } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { ThemePreview } from '@/core/components/common/theme-preview';
import { PreferenceTile } from './preference-tile';

export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_CHOICES: ReadonlyArray<ThemeChoice> = ['light', 'dark', 'system'];

const LABEL_KEYS = {
	light: 'common.THEME_LIGHT',
	dark: 'common.THEME_DARK',
	system: 'settings.preferences.THEME_SYSTEM'
} as const;

function ThemeTilePreview({ choice }: Readonly<{ choice: ThemeChoice }>) {
	if (choice === 'system') {
		return (
			<>
				<ThemePreview variant="light" className="block h-auto w-full" />
				<ThemePreview
					variant="dark"
					className="absolute inset-0 block h-full w-full [clip-path:inset(0_0_0_50%)]"
				/>
			</>
		);
	}
	return <ThemePreview variant={choice} className="block h-auto w-full" />;
}

export function ThemeTiles() {
	const t = useTranslations();
	const name = useId();
	const { theme, setTheme } = useTheme();

	return (
		<fieldset className="grid grid-cols-3 gap-3 p-4">
			<legend className="sr-only">{t('settings.preferences.SECTION_THEME')}</legend>
			{THEME_CHOICES.map((choice) => (
				<PreferenceTile
					key={choice}
					name={name}
					value={choice}
					label={t(LABEL_KEYS[choice])}
					isPicked={theme === choice}
					onPick={() => setTheme(choice)}
					preview={<ThemeTilePreview choice={choice} />}
				/>
			))}
		</fieldset>
	);
}
