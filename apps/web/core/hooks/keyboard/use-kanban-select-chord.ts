'use client';

import { useMemo } from 'react';
import type { ShortcutChord } from '@/core/lib/keyboard/shortcuts';
import { useKeyboardPreferences } from './use-keyboard-preferences';

/** The key that toggles a focused card of a board: the task list's own (`X`, or what the person rebound it to). */
export function useKanbanSelectChord(): ShortcutChord | null {
	const { bindings } = useKeyboardPreferences();
	return useMemo(() => {
		const binding = bindings.get('listSelect');
		return binding?.length === 1 ? binding[0] : null;
	}, [bindings]);
}
