'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import {
	bindingKeyCaps,
	bindingSearchWords,
	commandOfTypedSequence,
	SHORTCUT_COMMANDS
} from '@/core/lib/keyboard/shortcuts';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';
import { shortcutHandlersAtom, type ShortcutHandler } from '@/core/stores/common/shortcuts';
import { useKeyboardPreferences } from './use-keyboard-preferences';
import { useShortcutHandlers } from './use-shortcuts';

/**
 * The registry command each command palette entry runs (by the entry's `commandPalette.commands` key) while the
 * registry is on: the entry then shows that command's binding in force, and the registry's listener handles its
 * keys. "Assign to me" has no action yet, so it has no command (and no key) until it does.
 */
export const PALETTE_COMMAND_IDS = {
	inviteUser: 'inviteUser',
	toggleTheme: 'themeToggle',
	createTask: 'taskCreate',
	searchTasks: 'searchTasks',
	createTeam: 'teamCreate',
	searchTeams: 'searchTeams',
	createProject: 'projectCreate',
	searchProjects: 'searchProjects',
	goToMyTasks: 'goProfile',
	goToTeamTasks: 'goTasks',
	goToProjects: 'goProjects',
	goToKanban: 'goKanban',
	goToHome: 'goHome',
	goToTimesheets: 'goTimesheets',
	goToWeeklyLimit: 'goWeeklyLimit',
	goToTimeAndActivity: 'goTimeActivity',
	profile: 'goProfile',
	settings: 'settingsOpen'
} as const;

const NO_HANDLERS: Record<string, ShortcutHandler> = {};

/** The commands a sequence typed into the palette can run: the global ones someone registered a handler for. */
function runnableGlobalCommands(handlers: ReadonlyMap<string, ShortcutHandler>) {
	return SHORTCUT_COMMANDS.filter((command) => command.context === 'global' && handlers.has(command.id));
}

/**
 * The command palette's side of the shortcut registry, with `NEXT_PUBLIC_TASK_VIEWS_ENABLED`: registers the
 * handlers of the palette's own commands, gives each entry the key caps of its binding in force (none for a
 * command nobody can run right now) and the words it is also found by (`g t`, `gt`), and finds the command whose
 * sequence is typed into the field (`g t`). With the flag off it does nothing, and the palette keeps its own keys.
 */
export function usePaletteShortcuts(handlers: Record<string, ShortcutHandler>) {
	const isOn = isTaskViewsEnabled();
	useShortcutHandlers(isOn ? handlers : NO_HANDLERS);
	const registered = useAtomValue(shortcutHandlersAtom);
	const { bindings } = useKeyboardPreferences();
	const { os } = useDetectOS();
	const isMac = os === 'Mac';

	const keysOf = useCallback(
		(commandId: string | undefined): string[] => {
			if (!isOn || !commandId || !registered.has(commandId)) return [];
			const binding = bindings.get(commandId);
			return binding ? bindingKeyCaps(binding, isMac).flat() : [];
		},
		[bindings, isMac, isOn, registered]
	);

	const searchWordsOf = useCallback(
		(commandId: string | undefined): string[] => {
			if (!isOn || !commandId || !registered.has(commandId)) return [];
			return bindingSearchWords(bindings.get(commandId));
		},
		[bindings, isOn, registered]
	);

	/** The handler of the command whose sequence the text is (`g t`), or null when it names none. */
	const handlerOfTypedSequence = useCallback(
		(text: string): ShortcutHandler | null => {
			if (!isOn) return null;
			const command = commandOfTypedSequence(text, runnableGlobalCommands(registered), bindings);
			return (command && registered.get(command.id)) || null;
		},
		[bindings, isOn, registered]
	);

	return { isOn, keysOf, searchWordsOf, handlerOfTypedSequence };
}
