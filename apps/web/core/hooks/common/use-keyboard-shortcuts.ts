'use client';

import { useEffect, useCallback, useMemo, useState } from 'react';

// Types for improved legibility and safety
type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta' | null;
type ShortcutAction = () => void;

// Shortcut configuration interfaces
export interface CommandShortcutConfig {
	sequence: string[];
	modifiers?: KeyModifier[];
	description: string;
	shortcutDisplay: string;
	action: ShortcutAction;
	icon?: React.ReactNode;
}

export interface CommandGroupConfig {
	heading: string;
	commands: CommandShortcutConfig[];
}

/**
 * Hook to install global keyboard shortcut managers
 */
export const useKeyboardShortcuts = (
	shortcutConfigs: CommandShortcutConfig[],
	setCommandPaletteOpen?: (isOpen: boolean) => void
) => {
	// Status for key sequences
	const [keySequence, setKeySequence] = useState<string[]>([]);
	const [keyTimeout, setKeyTimeout] = useState<NodeJS.Timeout | null>(null);

	// Create a map for quick access to shortcut actions
	const shortcutMap = useMemo(() => {
		const map = new Map<string, ShortcutAction>();

		// Special shortcuts for the command palette
		if (setCommandPaletteOpen) {
			map.set('j|ctrl', () => setCommandPaletteOpen(true));
			map.set('k|ctrl', () => setCommandPaletteOpen(true));
		}

		// Add all configured shortcuts
		shortcutConfigs.forEach((config) => {
			const modifierString = config.modifiers?.length ? (config.modifiers.includes('ctrl') ? '|ctrl' : '') : '';

			// One-touch shortcut management
			if (config.sequence.length === 1) {
				map.set(`${config.sequence[0]}${modifierString}`, config.action);
			}
			// Two-touch shortcut management
			else if (config.sequence.length === 2) {
				map.set(`${config.sequence[0]}|${config.sequence[1]}${modifierString}`, config.action);
			}
		});

		return map;
	}, [shortcutConfigs, setCommandPaletteOpen]);

	// Optimized keyboard shortcut handler
	const handleKeyboardShortcut = useCallback(
		(e: KeyboardEvent) => {
			// Do not process shortcuts if we are in a text field
			const isInTextField =
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				(e.target instanceof HTMLElement && e.target.isContentEditable);
			if (isInTextField) {
				return;
			}

			const modifier = e.metaKey || e.ctrlKey;
			const key = e.key.toLowerCase();
			const modifierString = modifier ? '|ctrl' : '';

			// Shortcuts to open the command palette
			if ((key === 'j' || key === 'k') && modifier && setCommandPaletteOpen) {
				e.preventDefault();
				setCommandPaletteOpen(true);
				return;
			}

			// One-touch shortcut
			const singleKeyShortcut = `${key}${modifierString}`;
			if (shortcutMap.has(singleKeyShortcut)) {
				e.preventDefault();
				const action = shortcutMap.get(singleKeyShortcut)!;
				action();
				return;
			}

			// Two-touch shortcut
			if (keySequence.length === 1) {
				const sequenceKey = `${keySequence[0]}|${key}${modifierString}`;

				if (shortcutMap.has(sequenceKey)) {
					e.preventDefault();
					const action = shortcutMap.get(sequenceKey)!;
					action();

					// Reset the sequence
					if (keyTimeout) clearTimeout(keyTimeout);
					setKeySequence([]);
					setKeyTimeout(null);
					return;
				}
			}

			// If no shortcut was triggered, add the key to the sequence
			if (!modifier) {
				setKeySequence([key]);

				if (keyTimeout) clearTimeout(keyTimeout);
				const timeout = setTimeout(() => {
					setKeySequence([]);
					setKeyTimeout(null);
				}, 1000);
				setKeyTimeout(timeout);
			}
		},
		[keySequence, keyTimeout, shortcutMap, setCommandPaletteOpen]
	);

	// Installation of event listeners
	useEffect(() => {
		document.addEventListener('keydown', handleKeyboardShortcut);
		return () => {
			document.removeEventListener('keydown', handleKeyboardShortcut);
			if (keyTimeout) clearTimeout(keyTimeout);
		};
	}, [handleKeyboardShortcut, keyTimeout]);

	return {
		keySequence
	};
};

export default useKeyboardShortcuts;
