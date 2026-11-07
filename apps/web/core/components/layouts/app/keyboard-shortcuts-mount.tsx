'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { commandPaletteOpenAtom } from '@/core/stores/common/command-palette';
import { shortcutsHelpOpenAtom, type ShortcutHandler } from '@/core/stores/common/shortcuts';
import { ShortcutsDialog } from '@/core/components/common/shortcuts-dialog';
import { useShortcutHandlers, useShortcutListener } from '@/core/hooks/keyboard/use-shortcuts';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { readRuntimeEnv } from '@/env-config';

/** Whether a sibling feature's page exists on this deployment (its own runtime flag). */
function isFeatureOn(name: 'NEXT_PUBLIC_DOCS_ENABLED' | 'NEXT_PUBLIC_CHAT_ENABLED' | 'NEXT_PUBLIC_INBOX_ENABLED'): boolean {
	return (readRuntimeEnv(name) || process.env[name]) === 'true';
}

function GlobalShortcuts() {
	const router = useRouter();
	const setPaletteOpen = useSetAtom(commandPaletteOpenAtom);
	const setHelpOpen = useSetAtom(shortcutsHelpOpenAtom);

	const handlers = useMemo<Record<string, ShortcutHandler>>(() => {
		const go = (path: string) => () => router.push(path);
		const result: Record<string, ShortcutHandler> = {
			'palette.open': () => setPaletteOpen(true),
			'help.open': () => setHelpOpen((open) => !open),
			'settings.open': go('/settings/personal'),
			'go.tasks': go('/team/tasks'),
			'go.mine': go('/views/mine'),
			'go.thisWeek': go('/views/this-week'),
			'go.overdue': go('/views/overdue'),
			'go.views': go('/views')
		};
		if (isFeatureOn('NEXT_PUBLIC_DOCS_ENABLED')) result['go.docs'] = go('/docs');
		if (isFeatureOn('NEXT_PUBLIC_CHAT_ENABLED')) result['go.chat'] = go('/chat');
		if (isFeatureOn('NEXT_PUBLIC_INBOX_ENABLED')) result['go.inbox'] = go('/inbox');
		return result;
	}, [router, setHelpOpen, setPaletteOpen]);

	useShortcutHandlers(handlers);
	useShortcutListener();
	return <ShortcutsDialog />;
}

/**
 * Mounts the shortcut registry's listener and the global commands (palette, help, settings, "go to") once, in the
 * main layout, and the help dialog with them. Only with `NEXT_PUBLIC_TASK_VIEWS_ENABLED`: without it the app keeps
 * exactly the keys it had.
 */
export function KeyboardShortcutsMount() {
	if (!isTaskViewsEnabled()) return null;
	return <GlobalShortcuts />;
}
