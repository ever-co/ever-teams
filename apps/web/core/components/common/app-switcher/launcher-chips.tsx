'use client';

import { useTranslations } from 'next-intl';
import type { LauncherItem } from '@/core/lib/utils/app-launcher';

/** Quiet text, not a coloured badge: the chip says a fact about the row and nothing more. */
const CHIP =
	'inline-flex h-5 shrink-0 items-center rounded-md bg-foreground/[0.06] px-1.5 text-[11px] font-medium text-muted-foreground';

/** The facts of a row, as in every Ever app's launcher: "You're here", "Beta", "Soon". */
export function LauncherChips({ item }: Readonly<{ item: Pick<LauncherItem, 'isCurrent' | 'status'> }>) {
	const t = useTranslations();
	const isBeta = item.status === 'beta';
	const isComingSoon = item.status === 'soon';
	return (
		<>
			{item.isCurrent && <span className={CHIP}>{t('switchers.CHIP_CURRENT')}</span>}
			{isBeta && <span className={CHIP}>{t('switchers.CHIP_BETA')}</span>}
			{isComingSoon && <span className={CHIP}>{t('switchers.CHIP_SOON')}</span>}
		</>
	);
}
