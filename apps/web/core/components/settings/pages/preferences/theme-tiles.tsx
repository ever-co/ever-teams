'use client';

import { useId } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { ThemePreview } from '@/core/components/common/theme-preview';
import { cn } from '@/core/lib/helpers';

export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_CHOICES: ReadonlyArray<ThemeChoice> = ['light', 'dark', 'system'];

const LABEL_KEYS = {
	light: 'common.THEME_LIGHT',
	dark: 'common.THEME_DARK',
	system: 'settings.preferences.THEME_SYSTEM'
} as const;

const PREVIEW_FRAME = 'relative block overflow-hidden rounded-lg transition-shadow';

const PREVIEW_IDLE = 'hairline-ring ring-border';

const PREVIEW_PICKED = 'ring-2 ring-primary';

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
			{THEME_CHOICES.map((choice) => {
				const isPicked = theme === choice;
				return (
					<label key={choice} className="flex min-w-0 cursor-pointer flex-col gap-2">
						<input
							type="radio"
							name={name}
							value={choice}
							checked={isPicked}
							onChange={() => setTheme(choice)}
							className="peer sr-only"
						/>
						<span
							className={cn(
								PREVIEW_FRAME,
								'peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/25',
								isPicked && PREVIEW_PICKED,
								!isPicked && PREVIEW_IDLE
							)}
						>
							<ThemeTilePreview choice={choice} />
							{isPicked && <SelectedMark className="absolute bottom-1.5 left-1.5" />}
						</span>
						<span className="truncate text-[13px] font-medium text-foreground">
							{t(LABEL_KEYS[choice])}
						</span>
					</label>
				);
			})}
		</fieldset>
	);
}
