'use client';

import { useEffect, useSyncExternalStore } from 'react';
import hotkeys, { HotkeysEvent } from 'hotkeys-js';
import { isShortcutSequencePending } from '@/core/hooks/keyboard/use-shortcuts';
import type { HotkeyGroup } from '@/core/lib/keyboard/shortcut-sheet';

/**
 * The declarations bound right now. `hotkeys.unbind(key)` drops every listener of the key, whoever bound it, so a
 * declaration leaves this set as soon as one of its components unmounts, and comes back when one binds it again.
 */
const boundHotkeys = new Set<string>();
let boundSnapshot: ReadonlySet<string> = new Set<string>();
const boundListeners = new Set<() => void>();
let isPublishPending = false;
const NO_BOUND_HOTKEYS: ReadonlySet<string> = new Set<string>();

function publishBoundHotkeys(): void {
	isPublishPending = false;
	const boundNow = [...boundHotkeys];
	const hasSameSize = boundSnapshot.size === boundNow.length;
	const hasSameKeys = hasSameSize && boundNow.every((key) => boundSnapshot.has(key));
	if (hasSameKeys) {
		return;
	}
	boundSnapshot = new Set(boundHotkeys);
	for (const listener of boundListeners) {
		listener();
	}
}

/** A component that binds again on a new callback unbinds first: readers hear once both are done, if anything changed. */
function schedulePublish(): void {
	if (isPublishPending) {
		return;
	}
	isPublishPending = true;
	queueMicrotask(publishBoundHotkeys);
}

function subscribeToBoundHotkeys(listener: () => void): () => void {
	boundListeners.add(listener);
	return () => {
		boundListeners.delete(listener);
	};
}

function readBoundHotkeys(): ReadonlySet<string> {
	return boundSnapshot;
}

function readNoBoundHotkeys(): ReadonlySet<string> {
	return NO_BOUND_HOTKEYS;
}

/**
 * The hotkeys bound right now, by their declaration (`HostKeys.ASSIGN_TASK`). A hotkey works only while the component
 * that binds it is on the page: the shortcuts sheet lists the ones that do.
 */
export function useBoundHotkeys(): ReadonlySet<string> {
	return useSyncExternalStore(subscribeToBoundHotkeys, readBoundHotkeys, readNoBoundHotkeys);
}

export const useHotkeys = (key: string, callback: (e?: KeyboardEvent, h?: HotkeysEvent) => void) => {
	useEffect(() => {
		hotkeys(key, (event, handler) => {
			// The second key of a shortcut registry sequence (`G`, then `H` or `A`) is the registry's, not this one's.
			if (isShortcutSequencePending()) {
				return;
			}
			event.preventDefault();
			callback(event, handler);
		});
		boundHotkeys.add(key);
		schedulePublish();

		return () => {
			hotkeys.unbind(key);
			boundHotkeys.delete(key);
			schedulePublish();
		};
	}, [key, callback]);
};

const START_TIMER_KEYS = 'ctrl+option+],ctrl+alt+]';
const STOP_TIMER_KEYS = 'ctrl+option+[,ctrl+alt+[';

export const HostKeys = {
	START_TIMER: START_TIMER_KEYS,
	STOP_TIMER: STOP_TIMER_KEYS,
	// What the timer binds: one listener for its start keys and its stop keys.
	START_STOP_TIMER: `${START_TIMER_KEYS},${STOP_TIMER_KEYS}`,
	ASSIGN_TASK: 'shift+a,a',
	SHORTCUT_LIST: 'shift+h,h',
	CREATE_TASK: 'shift+c,c'
};

/**
 * The hotkeys as the shortcuts sheet lists them: each line names the declaration of `HostKeys` that presses it, so
 * its key caps are read from what is bound, never written twice.
 */
export const HostKeysMapping: HotkeyGroup[] = [
	{
		group: 'general',
		keySequence: [{ label: 'TO_OPEN_SHORTCUT_LIST', keys: HostKeys.SHORTCUT_LIST, command: 'helpOpen' }]
	},
	{
		group: 'timer',
		keySequence: [
			{ label: 'START_TIMER', keys: HostKeys.START_TIMER, boundAs: HostKeys.START_STOP_TIMER },
			{ label: 'STOP_TIMER', keys: HostKeys.STOP_TIMER, boundAs: HostKeys.START_STOP_TIMER }
		]
	},
	{
		group: 'tasks',
		keySequence: [
			{ label: 'ASSIGN_TASK', keys: HostKeys.ASSIGN_TASK },
			{ label: 'CREATE_TASK', keys: HostKeys.CREATE_TASK, command: 'taskCreate' }
		]
	}
];
