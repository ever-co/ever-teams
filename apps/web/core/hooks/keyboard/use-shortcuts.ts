'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
	chordOfEvent,
	DIALOG_SAFE_COMMANDS,
	isDialogOpen,
	isTypingTarget,
	matchSequence,
	SHORTCUT_COMMANDS,
	type ShortcutBinding,
	type ShortcutChord,
	type ShortcutContext
} from '@/core/lib/keyboard/shortcuts';
import { shortcutContextsAtom, shortcutHandlersAtom, type ShortcutHandler } from '@/core/stores/common/shortcuts';
import { useKeyboardPreferences } from './use-keyboard-preferences';

/** How long the next chord of a sequence may take. */
const SEQUENCE_TIMEOUT_MS = 1000;

/**
 * Registers the handlers of some commands while the caller is mounted, and marks its contexts active. A page
 * registers what it can do (`list.saveView` on the tasks list); the layout registers the global ones.
 */
export function useShortcutHandlers(handlers: Record<string, ShortcutHandler>, contexts: ShortcutContext[] = []): void {
	const setHandlers = useSetAtom(shortcutHandlersAtom);
	const setContexts = useSetAtom(shortcutContextsAtom);
	const latest = useRef(handlers);
	latest.current = handlers;
	const ids = Object.keys(handlers)
		.sort((first, second) => first.localeCompare(second))
		.join('|');
	const contextKey = contexts.join('|');

	useEffect(() => {
		const entries = ids ? ids.split('|') : [];
		setHandlers((current) => {
			const next = new Map(current);
			for (const id of entries) next.set(id, () => latest.current[id]?.());
			return next;
		});
		const added = contextKey ? (contextKey.split('|') as ShortcutContext[]) : [];
		if (added.length) setContexts((current) => [...current, ...added]);
		return () => {
			setHandlers((current) => {
				const next = new Map(current);
				for (const id of entries) next.delete(id);
				return next;
			});
			if (added.length) {
				setContexts((current) => {
					const next = [...current];
					for (const context of added) {
						const at = next.indexOf(context);
						if (at >= 0) next.splice(at, 1);
					}
					return next;
				});
			}
		};
	}, [contextKey, ids, setContexts, setHandlers]);
}

/**
 * The one key listener of the app's shortcut registry: matches each key press (outside text fields) against the
 * bindings in force for the active contexts, walks sequences, and runs the command's registered handler.
 * Mounted once by the layout. Commands with no handler registered are ignored, so a key never fires twice with
 * the page's own listeners (which keep handling their fixed keys).
 */
export function useShortcutListener(): void {
	const { bindings } = useKeyboardPreferences();
	const handlers = useAtomValue(shortcutHandlersAtom);
	const contexts = useAtomValue(shortcutContextsAtom);
	const pending = useRef<ShortcutChord[]>([]);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearPending = useCallback(() => {
		pending.current = [];
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	}, []);

	useEffect(() => {
		const active: ShortcutContext[] = ['global', ...contexts];
		// Only the commands someone can run right now take part, so the page's own keys are never shadowed.
		const runnable = SHORTCUT_COMMANDS.filter((command) => handlers.has(command.id));
		const runnableBindings = new Map<string, ShortcutBinding | null>();
		for (const command of runnable) runnableBindings.set(command.id, bindings.get(command.id) ?? null);

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.isComposing) return;
			const chord = chordOfEvent(event);
			if (!chord) return;
			// A bare letter typed in a field is text; a chord with ⌘/Ctrl is a command anywhere.
			if (isTypingTarget(event.target) && !chord.mod) return;
			// An open dialog has the keys: a "go to" must not leave its unsaved form; only the palette and help toggles stay.
			const usable = isDialogOpen(typeof document === 'undefined' ? undefined : document)
				? runnable.filter((command) => DIALOG_SAFE_COMMANDS.has(command.id))
				: runnable;
			const pressed = [...pending.current, chord];
			let { command, pending: morePossible } = matchSequence(pressed, usable, runnableBindings, active);
			// A chord that ends a sequence without completing one is tried on its own (`g`, then ⌘/Ctrl+, opens Settings).
			if (!command && !morePossible && pending.current.length) {
				clearPending();
				({ command, pending: morePossible } = matchSequence([chord], usable, runnableBindings, active));
			}
			if (command) {
				event.preventDefault();
				clearPending();
				handlers.get(command.id)?.();
				return;
			}
			if (morePossible) {
				event.preventDefault();
				pending.current = pressed;
				if (timer.current) clearTimeout(timer.current);
				timer.current = setTimeout(clearPending, SEQUENCE_TIMEOUT_MS);
				return;
			}
			if (pending.current.length) clearPending();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			clearPending();
		};
	}, [bindings, clearPending, contexts, handlers]);
}
