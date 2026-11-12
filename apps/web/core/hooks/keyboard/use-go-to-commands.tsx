'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import type { CommandShortcutConfig } from '@/core/hooks/common/use-keyboard-shortcuts';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { bindingKeyCaps, bindingSearchWords, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { readRuntimeEnv } from '@/env-config';
import { useKeyboardPreferences } from './use-keyboard-preferences';

/** The "go to" commands of the registry and where each leads; the ones behind a sibling feature's flag only with it. */
const GO_TO: Array<{ id: string; path: string; flag?: 'NEXT_PUBLIC_DOCS_ENABLED' | 'NEXT_PUBLIC_CHAT_ENABLED' | 'NEXT_PUBLIC_INBOX_ENABLED' }> = [
	{ id: 'goTasks', path: '/team/tasks' },
	{ id: 'goMine', path: '/views/mine' },
	{ id: 'goThisWeek', path: '/views/this-week' },
	{ id: 'goOverdue', path: '/views/overdue' },
	{ id: 'goViews', path: '/views' },
	{ id: 'goDocs', path: '/docs', flag: 'NEXT_PUBLIC_DOCS_ENABLED' },
	{ id: 'goChat', path: '/chat', flag: 'NEXT_PUBLIC_CHAT_ENABLED' },
	{ id: 'goInbox', path: '/inbox', flag: 'NEXT_PUBLIC_INBOX_ENABLED' }
];

function isFlagOn(flag: string | undefined): boolean {
	if (!flag) return true;
	return (readRuntimeEnv(flag) || process.env[flag]) === 'true';
}

/**
 * The palette's "Go to" entries, from the shortcut registry with the bindings in force (so a changed binding shows
 * in the palette too). Empty while the saved-views feature is off; their keys are handled by the registry's own
 * listener, never by the palette's.
 */
export function useGoToCommands(icon?: React.ReactNode): CommandShortcutConfig[] {
	const t = useTranslations();
	const router = useRouter();
	const { os } = useDetectOS();
	const { bindings } = useKeyboardPreferences();
	const isMac = os === 'Mac';

	return useMemo(() => {
		if (!isTaskViewsEnabled()) return [];
		const commands: CommandShortcutConfig[] = [];
		for (const entry of GO_TO) {
			if (!isFlagOn(entry.flag)) continue;
			if (!SHORTCUT_COMMANDS.some((item) => item.id === entry.id)) continue;
			const binding = bindings.get(entry.id) ?? null;
			commands.push({
				sequence: [],
				description: t(`shortcuts.commands.${entry.id}` as DottedLanguageObjectStringPaths),
				shortcutDisplay: binding ? bindingKeyCaps(binding, isMac).map((caps) => caps.join('')).join(' ') : '',
				shortcutKeys: binding ? bindingKeyCaps(binding, isMac).flat() : [],
				keywords: bindingSearchWords(binding),
				commandId: entry.id,
				action: () => router.push(entry.path),
				icon
			});
		}
		return commands;
	}, [bindings, icon, isMac, router, t]);
}
