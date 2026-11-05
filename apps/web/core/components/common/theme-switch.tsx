'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Moon, Sun } from '@/core/components/icons';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';

type ThemeValue = 'light' | 'dark';

function themeValueOf(resolvedTheme: string | undefined): ThemeValue {
	if (resolvedTheme === 'dark') {
		return 'dark';
	}
	return 'light';
}

/** Matches the slide of the segmented control's thumb. */
const THEME_SWITCH_DELAY_MS = 200;

/**
 * Light or dark, as an inline icon switch on the menu row (the references' Appearance row). The theme provider
 * disables every transition while the theme changes, so the switch moves its thumb first and applies the theme
 * once the slide is over.
 */
export function ThemeSwitch() {
	const t = useTranslations();
	const { resolvedTheme, setTheme } = useTheme();
	const [pendingTheme, setPendingTheme] = useState<ThemeValue | null>(null);
	const themeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		return () => {
			if (themeTimerRef.current) {
				clearTimeout(themeTimerRef.current);
			}
		};
	}, []);

	const changeTheme = useCallback(
		(nextTheme: ThemeValue) => {
			setPendingTheme(nextTheme);
			if (themeTimerRef.current) {
				clearTimeout(themeTimerRef.current);
			}
			themeTimerRef.current = setTimeout(() => {
				setTheme(nextTheme);
				setPendingTheme(null);
			}, THEME_SWITCH_DELAY_MS);
		},
		[setTheme]
	);

	const themeItems: SegmentedControlItem<ThemeValue>[] = [
		{ value: 'light', icon: <Sun />, ariaLabel: t('common.THEME_LIGHT') },
		{ value: 'dark', icon: <Moon />, ariaLabel: t('common.THEME_DARK') }
	];
	const shownTheme = pendingTheme ?? themeValueOf(resolvedTheme);

	return (
		<SegmentedControl
			items={themeItems}
			value={shownTheme}
			onValueChange={changeTheme}
			ariaLabel={t('common.THEME')}
		/>
	);
}
