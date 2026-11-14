'use client';

import { useMemo } from 'react';
import type { SettingsEntryId } from '@/core/components/settings/kit/settings-entries';
import {
	type TaskAutomationsAvailability,
	useTaskAutomationsAvailability
} from '@/core/hooks/task-automations/use-task-automations';
import {
	type UserApiTokensAvailability,
	useUserApiTokensAvailability
} from '@/core/hooks/settings/use-user-api-tokens';

/** Shown while the platform says it has the automations (also to a person it refuses, whose page explains why). */
export function showsAutomationsEntry(availability: TaskAutomationsAvailability): boolean {
	return availability === 'available' || availability === 'forbidden' || availability === 'error';
}

/** Shown only once the server says it has personal API tokens on (`GET /user-api-tokens/config`). */
export function showsApiTokensEntry(availability: UserApiTokensAvailability): boolean {
	return availability === 'enabled';
}

export function hiddenSettingsEntriesOf({
	showsAutomations,
	showsApiTokens
}: {
	showsAutomations: boolean;
	showsApiTokens: boolean;
}): ReadonlySet<SettingsEntryId> {
	const hidden = new Set<SettingsEntryId>();
	if (!showsAutomations) {
		hidden.add('automations');
	}
	if (!showsApiTokens) {
		hidden.add('apiTokens');
	}
	return hidden;
}

/**
 * The optional settings entries this deployment does not offer right now: Automations while its switch is off
 * (nothing is asked then), or while the platform has not said it serves them (asked once, and only for a person who
 * could see the entry: a manager); API tokens while the server has not said it has them on (its answer is kept for
 * five minutes).
 */
export function useHiddenSettingsEntries(canManageTeam: boolean): ReadonlySet<SettingsEntryId> {
	const { availability } = useTaskAutomationsAvailability(canManageTeam);
	const { availability: apiTokensAvailability } = useUserApiTokensAvailability();
	const showsAutomations = showsAutomationsEntry(availability);
	const showsApiTokens = showsApiTokensEntry(apiTokensAvailability);
	return useMemo(
		() => hiddenSettingsEntriesOf({ showsAutomations, showsApiTokens }),
		[showsAutomations, showsApiTokens]
	);
}
