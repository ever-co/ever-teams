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

/**
 * The current organization's tracking requirements and the save of one switch. A failed save shows its reason and
 * throws, so the switch goes back to the stored value.
 */
export function useOrganizationTrackingRequirements() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	useGetCurrentOrganization({ enabled: true });
	const organization = useAtomValue(currentOrganizationState);

	const saveRequirement = useCallback(
		async (requirement: TTrackingRequirement, isRequired: boolean) => {
			if (!organization) {
				throw new Error('No current organization');
			}
			const changes = { [requirement]: isRequired };
			try {
				await organizationService.updateOrganization(organization, changes);
			} catch (error) {
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t('settings.teamGeneral.REQUIREMENT_NOT_SAVED'), { description: t(reasonKey) });
				throw error;
			}
			const savedOrganization: TOrganization = { ...organization, ...changes };
			const queryKey = queryKeys.workspaces.currentOrganizationByScope(getTenantIdCookie(), organization.id);
			queryClient.setQueryData(queryKey, savedOrganization);
		},
		[organization, queryClient, t]
	);

	return { organization, saveRequirement };
}
