'use client';

import { EverTeamsLogo } from '@/core/components/svgs';
import { ThemeSwitch } from '@/core/components/common/theme-switch';
import { LanguageDropDownWithFlags } from '@/core/components/common/language-dropdown-flags';

const LANGUAGE_PILL =
	'h-8 w-auto gap-1.5 rounded-full border-none bg-card px-3 text-[13px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)] hairline-ring ring-foreground/10 hover:bg-muted/50 dark:bg-foreground/5';

/** No app data here: the person may not be signed in yet. */
export function OutsideHeader({ hideLanguageSwitcher = false }: Readonly<{ hideLanguageSwitcher?: boolean }>) {
	return (
		<header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 sm:px-5">
			<EverTeamsLogo dash className="h-5" />
			<div className="flex items-center gap-2">
				{!hideLanguageSwitcher && (
					<LanguageDropDownWithFlags deferLoading showFlag={false} btnClassName={LANGUAGE_PILL} />
				)}
				<ThemeSwitch />
			</div>
		</header>
	);
}
