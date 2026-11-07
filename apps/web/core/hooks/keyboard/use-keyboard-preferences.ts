'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { uiPreferencesService, type IKeyboardUiPreferences } from '@/core/services/client/api/users/ui-preferences.service';
import { effectiveBindings, SHORTCUT_COMMANDS, type ShortcutBinding } from '@/core/lib/keyboard/shortcuts';
import { isTaskViewsEnabled } from '@/core/lib/utils/task-views-enabled';

/** The person's keyboard overrides as the platform keeps them on the user (`uiPreferences.keyboard.bindings`). */
export function useKeyboardOverrides(): Record<string, string> {
	const { data: user } = useUserQuery();
	return useMemo(() => {
		const preferences = (user as { uiPreferences?: { keyboard?: IKeyboardUiPreferences } | null } | undefined)?.uiPreferences;
		const bindings = preferences?.keyboard?.bindings;
		if (!bindings || typeof bindings !== 'object') return {};
		const result: Record<string, string> = {};
		for (const [id, binding] of Object.entries(bindings)) if (typeof binding === 'string') result[id] = binding;
		return result;
	}, [user]);
}

/** The bindings in force (defaults with the person's overrides), and a way to change them on the platform. */
export function useKeyboardPreferences() {
	const overrides = useKeyboardOverrides();
	const queryClient = useQueryClient();
	const bindings = useMemo<Map<string, ShortcutBinding | null>>(() => effectiveBindings(SHORTCUT_COMMANDS, overrides), [overrides]);

	const setOverrides = useCallback(
		async (next: Record<string, string>) => {
			await uiPreferencesService.setKeyboard({ bindings: next });
			await queryClient.invalidateQueries({ queryKey: queryKeys.users.me });
		},
		[queryClient]
	);

	return { bindings, overrides, setOverrides, canRebind: isTaskViewsEnabled() };
}
