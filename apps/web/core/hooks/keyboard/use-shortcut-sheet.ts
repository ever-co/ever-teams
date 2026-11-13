'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { SIDEBAR_KEYBOARD_SHORTCUT } from '@/core/components/common/sidebar';
import { TASK_SEARCH_FOCUS_ID, TASK_SEARCH_FOCUS_KEY } from '@/core/components/tasks/task-search-field';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { HostKeysMapping, useBoundHotkeys } from '@/core/hooks/common/use-hotkeys';
import { availableShortcutCommands } from '@/core/lib/keyboard/available-commands';
import { shortcutSheetOf, type OwnKeyLine, type ShortcutSheetSection } from '@/core/lib/keyboard/shortcut-sheet';
import { shortcutHandlersAtom } from '@/core/stores/common/shortcuts';
import { useAnsweredKeySet } from './use-answered-keys';
import { useKeyboardPreferences } from './use-keyboard-preferences';

/** The keys components answer by themselves, each built from the constant its own listener matches. */
const OWN_KEYS: readonly OwnKeyLine[] = [
	{
		id: 'sidebarToggle',
		group: 'general',
		labelKey: 'shortcuts.commands.sidebarToggle',
		binding: `mod+${SIDEBAR_KEYBOARD_SHORTCUT}`
	},
	{
		id: TASK_SEARCH_FOCUS_ID,
		group: 'tasks',
		labelKey: 'shortcuts.commands.taskSearchFocus',
		binding: TASK_SEARCH_FOCUS_KEY,
		onlyWhereAnswered: true
	}
];

/**
 * The shortcuts sheet for this person, right now: the registry's commands someone answers, the legacy hotkeys whose
 * component is on the page, and the keys components answer themselves, with the key caps of the system.
 */
export function useShortcutSheet(): ShortcutSheetSection[] {
	const { os } = useDetectOS();
	const { bindings, canRebind: registryOn } = useKeyboardPreferences();
	const registered = useAtomValue(shortcutHandlersAtom);
	const boundHotkeys = useBoundHotkeys();
	const answered = useAnsweredKeySet();
	const isMac = os === 'Mac';

	return useMemo(() => {
		return shortcutSheetOf({
			isMac,
			registryOn,
			commands: availableShortcutCommands(),
			bindings,
			registered,
			hotkeys: HostKeysMapping,
			boundHotkeys,
			answered,
			ownKeys: OWN_KEYS
		});
	}, [answered, bindings, boundHotkeys, isMac, registered, registryOn]);
}
