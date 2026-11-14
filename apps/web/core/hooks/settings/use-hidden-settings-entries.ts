'use client';

import { useMemo } from 'react';
import type { SettingsEntryId } from '@/core/components/settings/kit/settings-entries';
import { type TaskAutomationsAvailability, useTaskAutomationsAvailability } from '@/core/hooks/task-automations/use-task-automations';
import { type TwoFactorAvailability, useTwoFactorStatus } from '@/core/hooks/auth/use-two-factor-settings';

/** Shown while the platform says it has the automations (also to a person it refuses, whose page explains why). */
export function showsAutomationsEntry(availability: TaskAutomationsAvailability): boolean {
	return availability === 'available' || availability === 'forbidden' || availability === 'error';
}

/** Shown once the platform answers the two-factor state (a failed read too: the page explains and retries). */
export function showsSecurityEntry(availability: TwoFactorAvailability): boolean {
	return availability === 'ready' || availability === 'error';
}

/**
 * The optional settings entries this deployment does not offer right now: Automations while its switch is off
 * (nothing is asked then), or while the platform has not said it serves them (asked once, and only for a person who
 * could see the entry: a manager); Security on a platform without two-factor authentication (asked once a sign-in).
 */
export function useHiddenSettingsEntries(canManageTeam: boolean): ReadonlySet<SettingsEntryId> {
	const { availability } = useTaskAutomationsAvailability(canManageTeam);
	const { availability: twoFactorAvailability } = useTwoFactorStatus();
	const showsAutomations = showsAutomationsEntry(availability);
	const showsSecurity = showsSecurityEntry(twoFactorAvailability);
	return useMemo(() => {
		const hidden: SettingsEntryId[] = [];
		if (!showsAutomations) {
			hidden.push('automations');
		}
		if (!showsSecurity) {
			hidden.push('security');
		}
		return new Set<SettingsEntryId>(hidden);
	}, [showsAutomations, showsSecurity]);
}
