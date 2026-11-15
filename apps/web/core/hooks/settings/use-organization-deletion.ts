'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useAuthenticateUser } from '@/core/hooks/auth/use-authenticate-user';
import { useSwitchOrganization } from '@/core/hooks/organizations/teams/use-switch-organization';
import { useTeamMenuOrganizations } from '@/core/hooks/organizations/teams/use-team-menu-organizations';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import {
	canDeleteOrganization,
	deleteOrganizationAndLand,
	organizationDeletionBlock,
	organizationDeletionStatusOf,
	organizationToLandInAfterDeletion,
	type DeletableOrganization,
	type OrganizationDeletionBlock,
	type OrganizationDeletionStatus
} from '@/core/lib/utils/organization-deletion';
import { queryKeys } from '@/core/query/keys';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { organizationService } from '@/core/services/client/api/organizations';
import { localTimerStatusState, timerStartsInFlightState, timerStatusState } from '@/core/stores';
import type { TOrganizationCounts } from '@/core/types/schemas/organization/organization-counts.schema';

export type { OrganizationDeletionStatus };

export interface OrganizationDeletion {
	canDelete: boolean;
	status: OrganizationDeletionStatus;
	counts: TOrganizationCounts | null;
	block: OrganizationDeletionBlock | null;
	landing: DeletableOrganization | null;
	retry: () => void;
	deleteOrganization: () => Promise<void>;
}

function isOrganization(organization: DeletableOrganization | null | undefined): organization is DeletableOrganization {
	return Boolean(organization);
}

/**
 * The danger zone's deletion of the current organization (ever-co/ever-teams#5207): who may, what the confirmation
 * shows (read once it opens), and the delete, after which the person lands in another of their organizations as the
 * team menu's switch opens one, or signs in again to pick a workspace when they have none left there.
 */
export function useOrganizationDeletion(
	organization: DeletableOrganization | null,
	isConfirmOpen: boolean
): OrganizationDeletion {
	const { myPermissions } = useMyRolePermissionsQuery();
	const { logOut } = useAuthenticateUser();
	const menuOrganizations = useTeamMenuOrganizations();
	const switchOrganization = useSwitchOrganization();
	const organizationId = organization?.id ?? null;
	const canDelete = canDeleteOrganization(myPermissions);
	// The person's timer, read as the team menu reads it before a switch: this tab's start counts before the server's
	const timerStatus = useAtomValue(timerStatusState);
	const localTimerStatus = useAtomValue(localTimerStatusState);
	const isTimerStarting = useAtomValue(timerStartsInFlightState) > 0;
	const isTimerOn = Boolean(timerStatus?.running) || Boolean(localTimerStatus?.running) || isTimerStarting;

	const facts = useQuery({
		queryKey: queryKeys.organizations.deletionFacts(organizationId),
		queryFn: async () => {
			const id = organizationId as string;
			const [counts, workspaceOrganizationCount] = await Promise.all([
				organizationService.getOrganizationCounts(id),
				organizationService.countWorkspaceOrganizations()
			]);
			return { counts, workspaceOrganizationCount };
		},
		enabled: canDelete && isConfirmOpen && Boolean(organizationId),
		// Read each time the confirmation opens: another admin may have changed the workspace since
		staleTime: 0,
		gcTime: 0,
		retry: false,
		refetchOnWindowFocus: false
	});

	// The team menu keeps the person's organizations for ten minutes: one they joined since would be missed as the
	// organization to land in, and the delete would sign them out instead of opening it
	const refetchMemberships = menuOrganizations.refetch;
	const readsMemberships = canDelete && isConfirmOpen;
	useEffect(() => {
		if (readsMemberships) {
			void refetchMemberships();
		}
	}, [readsMemberships, refetchMemberships]);

	const menu = menuOrganizations.data;
	const memberships = menu ? [menu.current, ...menu.others].filter(isOrganization) : [];
	const landing = organizationId ? organizationToLandInAfterDeletion(memberships, organizationId) : null;
	const block = organizationDeletionBlock(facts.data?.workspaceOrganizationCount ?? null, isTimerOn);

	const status = organizationDeletionStatusOf({
		isFetching: facts.isFetching,
		isError: facts.isError,
		error: facts.error,
		isSuccess: facts.isSuccess,
		isMenuFetching: readsMemberships && menuOrganizations.isFetching,
		isMenuError: menuOrganizations.isError,
		isMenuSuccess: menuOrganizations.isSuccess
	});

	const retry = () => {
		void facts.refetch();
		if (menuOrganizations.isError) {
			void menuOrganizations.refetch();
		}
	};

	const deleteOrganization = async () => {
		if (!organizationId) {
			return;
		}
		await deleteOrganizationAndLand(landing, {
			softDelete: () => organizationService.softDeleteOrganization(organizationId),
			renewSession: async () => {
				await authService.refreshToken();
			},
			openOrganization: async (id) => {
				await switchOrganization.mutateAsync({ organizationId: id });
			},
			openWorkspacePicker: () => logOut()
		});
	};

	return {
		canDelete,
		status,
		counts: facts.data?.counts ?? null,
		block,
		landing,
		retry,
		deleteOrganization
	};
}
