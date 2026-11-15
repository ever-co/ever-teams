'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { INVITE_CALLBACK_PATH, INVITE_CALLBACK_URL } from '@/core/constants/config/constants';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useTimesheetInvalidation } from '@/core/hooks/timesheet/use-timesheet-invalidation';
import {
	apiKnowsPlaceholders,
	canManagePlaceholders,
	placeholderMemberInputOf,
	type PlaceholderForm
} from '@/core/lib/utils/member-placeholder';
import { memberEmployeeOf } from '@/core/lib/utils/settings-team';
import { queryKeys } from '@/core/query/keys';
import { employeePlaceholderService } from '@/core/services/client/api/organizations/employee-placeholder.service';
import { activeTeamState } from '@/core/stores';
import type {
	IEmployeePlaceholderBulkCreateItem,
	IEmployeePlaceholderMemberInput,
	IEmployeePlaceholderMergePreview,
	IEmployeePlaceholderMergeResult
} from '@/core/types/interfaces/organization/employee-placeholder';

/** The organization and the team every call names: the active team's. */
interface PlaceholderScope {
	tenantId: string;
	organizationId: string;
	teamId: string;
}

function claimCallbackUrl(): string {
	if (INVITE_CALLBACK_URL) {
		return INVITE_CALLBACK_URL;
	}
	return `${window.location.origin}${INVITE_CALLBACK_PATH}`;
}

/**
 * Members without an account in the active team: add one, invite the person to claim their time, or merge the member
 * into a member with an account. Offered only against an API that has them and to a viewer Gauzy lets add members
 * (`ORG_EMPLOYEES_EDIT`); the API refuses them to anyone else. Every write reloads the teams, so the lists show the
 * member as Gauzy now holds it.
 */
export function useMemberPlaceholders() {
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const { myPermissions } = useMyRolePermissionsQuery();
	const { invalidateTimesheetData } = useTimesheetInvalidation();
	// The claims sent from this page, by member: Gauzy lists a claim with the organization's invitations, not the team's
	const [claimsSent, setClaimsSent] = useState<Readonly<Record<string, string>>>({});

	const members = useMemo(() => activeTeam?.members ?? [], [activeTeam?.members]);
	const knowsPlaceholders = useMemo(
		() => apiKnowsPlaceholders(members.map((member) => memberEmployeeOf(member))),
		[members]
	);
	const isOffered = knowsPlaceholders && canManagePlaceholders(myPermissions);

	const tenantId = activeTeam?.tenantId ?? '';
	const organizationId = activeTeam?.organizationId ?? '';
	const teamId = activeTeam?.id ?? '';

	const scopeOf = useCallback((): PlaceholderScope => {
		if (!tenantId || !organizationId || !teamId) {
			throw new Error('No active team');
		}
		return { tenantId, organizationId, teamId };
	}, [organizationId, teamId, tenantId]);

	const reloadTeams = useCallback(async () => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
	}, [queryClient]);

	const addPlaceholder = useCallback(
		async (form: PlaceholderForm) => {
			const scope = scopeOf();
			const member = placeholderMemberInputOf(form);
			await employeePlaceholderService.create({
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				teamIds: [scope.teamId],
				...member
			});
			await reloadTeams();
		},
		[reloadTeams, scopeOf]
	);

	/** The members of an import that nobody in the team is, in the order given; one answer per member. */
	const addPlaceholders = useCallback(
		async (
			newMembers: ReadonlyArray<IEmployeePlaceholderMemberInput>
		): Promise<IEmployeePlaceholderBulkCreateItem[]> => {
			const scope = scopeOf();
			const { items } = await employeePlaceholderService.createBulk({
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				teamIds: [scope.teamId],
				members: [...newMembers]
			});
			await reloadTeams();
			return items;
		},
		[reloadTeams, scopeOf]
	);

	const sendClaim = useCallback(
		async (employeeId: string, email: string) => {
			const scope = scopeOf();
			const address = email.trim().toLowerCase();
			await employeePlaceholderService.sendClaim(employeeId, {
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				email: address,
				callbackUrl: claimCallbackUrl()
			});
			setClaimsSent((current) => ({ ...current, [employeeId]: address }));
		},
		[scopeOf]
	);

	const previewMerge = useCallback(
		async (employeeId: string, targetEmployeeId: string): Promise<IEmployeePlaceholderMergePreview> => {
			const scope = scopeOf();
			return employeePlaceholderService.previewMerge(employeeId, {
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				targetEmployeeId
			});
		},
		[scopeOf]
	);

	const merge = useCallback(
		async (employeeId: string, targetEmployeeId: string): Promise<IEmployeePlaceholderMergeResult> => {
			const scope = scopeOf();
			const result = await employeePlaceholderService.merge(employeeId, {
				tenantId: scope.tenantId,
				organizationId: scope.organizationId,
				targetEmployeeId
			});
			// The time moved to another member: every list of entries reads it again
			invalidateTimesheetData();
			void queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
			await reloadTeams();
			return result;
		},
		[invalidateTimesheetData, queryClient, reloadTeams, scopeOf]
	);

	return { isOffered, claimsSent, addPlaceholder, addPlaceholders, sendClaim, previewMerge, merge };
}

export type MemberPlaceholders = ReturnType<typeof useMemberPlaceholders>;
