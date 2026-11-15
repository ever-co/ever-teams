'use client';

import { useEffect } from 'react';
import { pressesBinding } from '@/core/lib/keyboard/key-press';
import { effectiveBindings, SHORTCUT_COMMANDS } from '@/core/lib/keyboard/shortcuts';

/** The registry's command that shows the shortcuts sheet. */
const HELP_COMMAND_ID = 'helpOpen';

/** The bindings while the registry is off: the defaults, as the task list reads its keys then. */
const DEFAULT_BINDINGS = effectiveBindings(SHORTCUT_COMMANDS, null);

/**
 * The help key (`?`, the default binding of the registry's help command) where the registry's listener is not
 * mounted: pressed outside a text field, it runs the handler. With the registry on, its own listener has the key.
 */
export function useHelpKey(onPress: () => void, enabled: boolean): void {
	useEffect(() => {
		if (!enabled) {
			return;
		}
		const helpBinding = DEFAULT_BINDINGS.get(HELP_COMMAND_ID);
		const onKeyDown = (event: KeyboardEvent) => {
			// By the character typed, as every key is read while the registry is off: the key that prints `?`
			// differs by layout.
			if (!pressesBinding(event, helpBinding, false)) {
				return;
			}
			event.preventDefault();
			onPress();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [enabled, onPress]);
}
