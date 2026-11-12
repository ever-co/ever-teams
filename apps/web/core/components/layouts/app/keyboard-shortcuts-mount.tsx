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
			<ShortcutsDialog />
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
 * Mounts the shortcut registry's listener and the global commands (palette, help, settings, "go to") once, in the
 * main layout, and the help dialog with them. Only with `NEXT_PUBLIC_TASK_VIEWS_ENABLED`: without it the app keeps
 * exactly the keys it had.
 */
export function KeyboardShortcutsMount() {
	if (!isTaskViewsEnabled()) return null;
	return <GlobalShortcuts />;
}
