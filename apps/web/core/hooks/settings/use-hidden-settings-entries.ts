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
import { type TwoFactorAvailability, useTwoFactorStatus } from '@/core/hooks/auth/use-two-factor-settings';
import { type EmbedsAvailability, useEmbedsAvailability } from '@/core/hooks/settings/use-embeds';

/** Shown while the platform says it has the automations (also to a person it refuses, whose page explains why). */
export function showsAutomationsEntry(availability: TaskAutomationsAvailability): boolean {
	return availability === 'available' || availability === 'forbidden' || availability === 'error';
}

/** Shown only once the server says it has personal API tokens on (`GET /user-api-tokens/config`). */
export function showsApiTokensEntry(availability: UserApiTokensAvailability): boolean {
	return availability === 'enabled';
}

/** Shown only to an administrator of the organization, once the server says it has embeds on. */
export function showsEmbedsEntry(availability: EmbedsAvailability): boolean {
	return availability === 'enabled';
}

/** Shown once the platform answers the two-factor state (a failed read too: the page explains and retries). */
export function showsSecurityEntry(availability: TwoFactorAvailability): boolean {
	return availability === 'ready' || availability === 'error';
}

export function hiddenSettingsEntriesOf({
	showsAutomations,
	showsApiTokens,
	showsSecurity,
	showsEmbeds = false
}: {
	showsAutomations: boolean;
	showsApiTokens: boolean;
	showsSecurity: boolean;
	showsEmbeds?: boolean;
}): ReadonlySet<SettingsEntryId> {
	const hidden = new Set<SettingsEntryId>();
	if (!showsAutomations) {
		hidden.add('automations');
	}
	if (!showsApiTokens) {
		hidden.add('apiTokens');
	}
	if (!showsSecurity) {
		hidden.add('security');
	}
	if (!showsEmbeds) {
		hidden.add('embeds');
	}
	return hidden;
}

/**
 * The optional settings entries this deployment does not offer right now: Automations while its switch is off
 * (nothing is asked then), or while the platform has not said it serves them (asked once, and only for a person who
 * could see the entry: a manager); API tokens while the server has not said it has them on (its answer is kept for
 * five minutes); Security on a platform without two-factor authentication (asked once a sign-in).
 *
 * Nothing is asked while `asks` is false: the command palette lists the settings pages on every page, and asks for
 * them only once it is open, so a page load never waits behind these reads (startup-performance.cy.ts).
 */
export function useHiddenSettingsEntries(canManageTeam: boolean, asks = true): ReadonlySet<SettingsEntryId> {
	const { availability } = useTaskAutomationsAvailability(canManageTeam && asks);
	const { availability: apiTokensAvailability } = useUserApiTokensAvailability(asks);
	const { availability: twoFactorAvailability } = useTwoFactorStatus(asks);
	const { availability: embedsAvailability } = useEmbedsAvailability(asks);
	const showsAutomations = showsAutomationsEntry(availability);
	const showsApiTokens = showsApiTokensEntry(apiTokensAvailability);
	const showsSecurity = showsSecurityEntry(twoFactorAvailability);
	const showsEmbeds = showsEmbedsEntry(embedsAvailability);
	return useMemo(
		() => hiddenSettingsEntriesOf({ showsAutomations, showsApiTokens, showsSecurity, showsEmbeds }),
		[showsAutomations, showsApiTokens, showsSecurity, showsEmbeds]
	);
}
