'use client';

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import { getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { queryKeys } from '@/core/query/keys';
import { organizationService } from '@/core/services/client/api/organizations';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';

export type TTrackingRequirement =
	| 'requireTeam'
	| 'requireProject'
	| 'requireTask'
	| 'requireClient'
	| 'requireDescription';

/** The organization switches that make every time entry name part of its context, in the order they are listed. */
export const TRACKING_REQUIREMENTS: ReadonlyArray<TTrackingRequirement> = [
	'requireTeam',
	'requireProject',
	'requireTask',
	'requireClient',
	'requireDescription'
];

/** An organization switch its admins turn on or off from the settings. */
type TOrganizationSwitch = TTrackingRequirement | 'restrictTrackingSwitchToHigherRoles';

/**
 * The current organization and the save of one of its switches. A failed save shows `notSavedKey` with its reason and
 * throws, so the switch goes back to the stored value.
 *
 * @param notSavedKey What the toast of a failed save says.
 */
function useOrganizationSwitch(notSavedKey: DottedLanguageObjectStringPaths) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const organizationRead = useGetCurrentOrganization({ enabled: true });
	const organization = useAtomValue(currentOrganizationState);

	const saveSwitch = useCallback(
		async (organizationSwitch: TOrganizationSwitch, isOn: boolean) => {
			if (!organization) {
				throw new Error('No current organization');
			}
			const changes = { [organizationSwitch]: isOn };
			// The workspace this save belongs to, read before the request: another tab may switch it meanwhile
			const queryKey = queryKeys.workspaces.currentOrganizationByScope(getTenantIdCookie(), organization.id);
			try {
				await organizationService.updateOrganization(organization, changes);
			} catch (error) {
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t(notSavedKey), { description: t(reasonKey) });
				throw error;
			}
			// Onto the latest cached organization: a save that ran alongside this one has already landed there
			const withThisChange = (cached: TOrganization | undefined): TOrganization => {
				const latest = cached ?? organization;
				return { ...latest, ...changes };
			};
			queryClient.setQueryData<TOrganization>(queryKey, withThisChange);
		},
		[notSavedKey, organization, queryClient, t]
	);

	const retryRead = organizationRead.refetch;
	const retryLoad = useCallback(() => {
		void retryRead();
	}, [retryRead]);

	return { organization, saveSwitch, isLoadFailed: organizationRead.isError, retryLoad };
}

/**
 * The current organization's tracking requirements and the save of one switch. A failed save shows its reason and
 * throws, so the switch goes back to the stored value.
 */
export function useOrganizationTrackingRequirements() {
	const { saveSwitch, ...organizationState } = useOrganizationSwitch('settings.teamGeneral.REQUIREMENT_NOT_SAVED');
	const saveRequirement: (requirement: TTrackingRequirement, isRequired: boolean) => Promise<void> = saveSwitch;
	return { ...organizationState, saveRequirement };
}

/**
 * Whether only someone of a higher role turns a person's time tracking on or off in the current organization
 * (`restrictTrackingSwitchToHigherRoles`, #5015), and its save. A failed save shows its reason and throws, so the
 * switch goes back to the stored value.
 */
export function useOrganizationTrackingSwitchRule() {
	const { organization, saveSwitch } = useOrganizationSwitch('settings.teamGeneral.TRACKING_SWITCH_RULE_NOT_SAVED');
	const saveRestriction = useCallback(
		(restricts: boolean) => saveSwitch('restrictTrackingSwitchToHigherRoles', restricts),
		[saveSwitch]
	);
	return { organization, saveRestriction };
}
