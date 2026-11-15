'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { commandPaletteOpenAtom } from '@/core/stores/common/command-palette';
import { shortcutsHelpOpenAtom, type ShortcutHandler } from '@/core/stores/common/shortcuts';
import { Modal } from '@/core/components/common/modal';
import { ShortcutsDialog } from '@/core/components/common/shortcuts-dialog';
import CreateTaskModal from '@/core/components/features/tasks/create-task-modal';
import { HostKeys, useHotkeys } from '@/core/hooks/common/use-hotkeys';
import { useHelpKey } from '@/core/hooks/keyboard/use-help-key';
import { useShortcutHandlers, useShortcutListener } from '@/core/hooks/keyboard/use-shortcuts';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { readRuntimeEnv } from '@/env-config';

/** Whether a sibling feature's page exists on this deployment (its own runtime flag). */
function isFeatureOn(
	name: 'NEXT_PUBLIC_DOCS_ENABLED' | 'NEXT_PUBLIC_CHAT_ENABLED' | 'NEXT_PUBLIC_INBOX_ENABLED'
): boolean {
	return (readRuntimeEnv(name) || process.env[name]) === 'true';
}

function GlobalShortcuts() {
	const t = useTranslations();
	const router = useRouter();
	const setPaletteOpen = useSetAtom(commandPaletteOpenAtom);
	const setHelpOpen = useSetAtom(shortcutsHelpOpenAtom);
	// `c` anywhere: the create-task dialog (the same one the header and the palette open).
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const closeCreate = useCallback(() => setIsCreateOpen(false), []);

	const handlers = useMemo<Record<string, ShortcutHandler>>(() => {
		const go = (path: string) => () => router.push(path);
		const result: Record<string, ShortcutHandler> = {
			paletteOpen: () => setPaletteOpen((open) => !open),
			helpOpen: () => setHelpOpen((open) => !open),
			taskCreate: () => setIsCreateOpen(true),
			settingsOpen: go('/settings/personal'),
			goTasks: go('/team/tasks'),
			goMine: go('/views/mine'),
			goThisWeek: go('/views/this-week'),
			goOverdue: go('/views/overdue'),
			goViews: go('/views')
		};
		if (isFeatureOn('NEXT_PUBLIC_DOCS_ENABLED')) result['goDocs'] = go('/docs');
		if (isFeatureOn('NEXT_PUBLIC_CHAT_ENABLED')) result['goChat'] = go('/chat');
		if (isFeatureOn('NEXT_PUBLIC_INBOX_ENABLED')) result['goInbox'] = go('/inbox');
		return result;
	}, [router, setHelpOpen, setPaletteOpen]);

	useShortcutHandlers(handlers);
	useShortcutListener();
	return (
		<>
			{isCreateOpen && (
				<Modal isOpen={isCreateOpen} closeModal={closeCreate}>
					<CreateTaskModal
						onClose={closeCreate}
						title={t('common.CREATE_TASK')}
						initEditMode={false}
						task={null}
						tasks={[]}
					/>
				</Modal>
			)}
		</>
	);
}

/**
 * The keys that open the shortcuts sheet whatever the registry: the legacy `H`, bound once here (the keyboard
 * buttons only open the sheet), and `?` while the registry's listener, which has that key otherwise, is not mounted.
 */
function ShortcutsSheetKeys({ answersHelpKey }: Readonly<{ answersHelpKey: boolean }>) {
	const setHelpOpen = useSetAtom(shortcutsHelpOpenAtom);
	const toggleHelp = useCallback(() => setHelpOpen((open) => !open), [setHelpOpen]);
	useHotkeys(HostKeys.SHORTCUT_LIST, toggleHelp);
	useHelpKey(toggleHelp, answersHelpKey);
	return null;
}

/**
 * Mounted once, in the main layout: the shortcuts sheet and the keys that open it, on every deployment, and the
 * shortcut registry's listener with the global commands (palette, help, settings, "go to") only with
 * `NEXT_PUBLIC_TASK_VIEWS_ENABLED`: without it the app keeps the keys it had, and gains `?`.
 */
export function KeyboardShortcutsMount() {
	const registryOn = isTaskViewsEnabled();
	return (
		<>
			{registryOn && <GlobalShortcuts />}
			<ShortcutsSheetKeys answersHelpKey={!registryOn} />
			<ShortcutsDialog />
		</>
	);
}
