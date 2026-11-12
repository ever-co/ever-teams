'use client';

import { useMemo } from 'react';
import type { SettingsEntryId } from '@/core/components/settings/kit/settings-entries';
import { type TaskAutomationsAvailability, useTaskAutomationsAvailability } from '@/core/hooks/task-automations/use-task-automations';

/** Shown while the platform says it has the automations (also to a person it refuses, whose page explains why). */
export function showsAutomationsEntry(availability: TaskAutomationsAvailability): boolean {
	return availability === 'available' || availability === 'forbidden' || availability === 'error';
}

/**
 * The optional settings entries this deployment does not offer right now: Automations while its switch is off
 * (nothing is asked then), or while the platform has not said it serves them (asked once, and only for a person who
 * could see the entry: a manager).
 */
export function useHiddenSettingsEntries(canManageTeam: boolean): ReadonlySet<SettingsEntryId> {
	const { availability } = useTaskAutomationsAvailability(canManageTeam);
	const showsAutomations = showsAutomationsEntry(availability);
	return useMemo(() => new Set<SettingsEntryId>(showsAutomations ? [] : ['automations']), [showsAutomations]);
}
