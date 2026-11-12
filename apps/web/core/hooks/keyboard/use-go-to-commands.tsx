'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import type { CommandShortcutConfig } from '@/core/hooks/common/use-keyboard-shortcuts';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { bindingKeyCaps, bindingSearchWords, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';
import { goToRowsOf, REGISTRY_GO_TO } from '@/core/lib/utils/palette-go-to';
import type { SidebarPage } from '@/core/lib/utils/sidebar-pages';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { readRuntimeEnv } from '@/env-config';
import { useKeyboardPreferences } from './use-keyboard-preferences';

function isFlagOn(flag: string | undefined): boolean {
	if (!flag) return true;
	return (readRuntimeEnv(flag) || process.env[flag]) === 'true';
}

/**
 * The palette's "Go to" entries: one row per page the sidebar lists for this person, then, with the saved-views
 * feature, the registry's "go to" commands that no row already leads to, with the bindings in force (so a changed
 * binding shows in the palette too). A row tied to a registry command carries its id, and the palette shows that
 * command's keys on it. The keys are handled by the registry's own listener, never by the palette's.
 */
export function useGoToCommands(icon?: React.ReactNode, pages?: readonly SidebarPage[]): CommandShortcutConfig[] {
	const t = useTranslations();
	const router = useRouter();
	const { os } = useDetectOS();
	const { bindings } = useKeyboardPreferences();
	const isMac = os === 'Mac';

	return useMemo(() => {
		const commands: CommandShortcutConfig[] = [];
		const rows = goToRowsOf(pages ?? []);
		const listedCommandIds = new Set<string>();
		for (const row of rows) {
			if (row.commandId) {
				listedCommandIds.add(row.commandId);
			}
			commands.push({
				sequence: [],
				description: row.title,
				section: row.section,
				shortcutDisplay: '',
				commandId: row.commandId,
				action: () => router.push(row.url),
				icon
			});
		}
		if (!isTaskViewsEnabled()) return commands;
		for (const entry of REGISTRY_GO_TO) {
			if (listedCommandIds.has(entry.id)) continue;
			if (!isFlagOn(entry.flag)) continue;
			if (!SHORTCUT_COMMANDS.some((item) => item.id === entry.id)) continue;
			const binding = bindings.get(entry.id) ?? null;
			commands.push({
				sequence: [],
				description: t(`shortcuts.commands.${entry.id}` as DottedLanguageObjectStringPaths),
				shortcutDisplay: binding
					? bindingKeyCaps(binding, isMac)
							.map((caps) => caps.join(''))
							.join(' ')
					: '',
				shortcutKeys: binding ? bindingKeyCaps(binding, isMac).flat() : [],
				keywords: bindingSearchWords(binding),
				commandId: entry.id,
				action: () => router.push(entry.path),
				icon
			});
		}
		return commands;
	}, [bindings, icon, isMac, pages, router, t]);
}
