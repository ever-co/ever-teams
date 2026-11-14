'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { entriesOfGroup, SETTINGS_GROUPS } from '@/core/components/settings/kit/settings-entries';
import { useHiddenSettingsEntries } from '@/core/hooks/settings/use-hidden-settings-entries';
import { sidebarPagesOf, type SidebarGroup, type SidebarLink, type SidebarPage } from '@/core/lib/utils/sidebar-pages';
import { canManageActiveTeamState } from '@/core/stores';
import { commandPaletteOpenAtom } from '@/core/stores/common/command-palette';

/**
 * The pages this sidebar links to, for the command palette's "Go to": the first-level links and the groups exactly
 * as the sidebar renders them, then the settings pages by the rules of the settings sidebar. One list, so a page the
 * sidebar hides from someone is not offered to them elsewhere.
 */
export function useSidebarPages(links: readonly SidebarLink[], groups: readonly SidebarGroup[]): SidebarPage[] {
	const t = useTranslations();
	const canManageTeam = useAtomValue(canManageActiveTeamState);
	// The optional settings pages are asked of the platform once the palette is open, never on a page load.
	const isPaletteOpen = useAtomValue(commandPaletteOpenAtom);
	const asksOptionalSettings = canManageTeam && isPaletteOpen;
	const hiddenSettings = useHiddenSettingsEntries(asksOptionalSettings);

	return useMemo(() => {
		const pages = sidebarPagesOf(links, groups);
		const settingsTitle = t('common.SETTINGS');
		for (const group of SETTINGS_GROUPS) {
			const entries = entriesOfGroup(group, canManageTeam, hiddenSettings);
			for (const entry of entries) {
				const title = t(`settings.entries.${entry.id}.TITLE`);
				pages.push({ title, url: entry.href, section: settingsTitle });
			}
		}
		return pages;
	}, [canManageTeam, groups, hiddenSettings, links, t]);
}
