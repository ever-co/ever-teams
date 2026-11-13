'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { activeTeamScopeState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { employeeService } from '@/core/services/client/api/organizations/teams';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	holdsInactiveMembersPermission,
	holdsMemberDeactivationPermission,
	inactiveMembersOfTeam,
	type InactiveMember
} from '@/core/lib/utils/member-access';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useMemberWorkEnd } from './use-member-access';

/**
 * The deactivated members of the active team, and their restoration. The employees are asked only once the list is
 * shown, and only for a viewer the API answers (ORG_EMPLOYEES_VIEW); restoring needs ORG_EMPLOYEES_EDIT.
 */
export function useInactiveMembers(isShown: boolean) {
	const t = useTranslations();
	const team = useAtomValue(activeTeamScopeState);
	const { myPermissions } = useMyRolePermissionsQuery();
	const { setMemberWorkEnd } = useMemberWorkEnd();
	const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());

	const teamId = team?.id;
	const organizationId = team?.organizationId ?? '';
	const tenantId = team?.tenantId ?? '';
	const canList = holdsInactiveMembersPermission(myPermissions);
	const canRestore = holdsMemberDeactivationPermission(myPermissions);
	const hasOrganization = Boolean(organizationId);
	const hasTenant = Boolean(tenantId);
	const hasScope = hasOrganization && hasTenant;
	const isAsked = isShown && canList;

	const query = useQuery({
		queryKey: queryKeys.users.employees.inactiveByScope(tenantId, organizationId),
		queryFn: ({ signal }) => employeeService.getInactiveEmployees({ organizationId, tenantId, signal }),
		enabled: isAsked && hasScope
	});

	const employees = query.data;
	const members = useMemo(() => inactiveMembersOfTeam(employees ?? [], teamId), [employees, teamId]);
	const hasAnswer = Boolean(employees);
	const isError = query.isError;
	const isWaiting = isAsked && !hasAnswer;
	const isLoading = isWaiting && !isError;

	const restore = useCallback(
		async (member: InactiveMember) => {
			const employeeId = member.employeeId;
			setBusyIds((current) => new Set(current).add(employeeId));
			try {
				await setMemberWorkEnd({ employeeId, organizationId, tenantId, endWork: null });
				toast.success(t('settings.members.RESTORED', { name: member.name }));
			} catch (error) {
				const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
				toast.error(t('settings.members.RESTORE_FAILED', { name: member.name }), { description: t(reasonKey) });
			} finally {
				setBusyIds((current) => {
					const next = new Set(current);
					next.delete(employeeId);
					return next;
				});
			}
		},
		[organizationId, setMemberWorkEnd, t, tenantId]
	);

	return {
		members,
		canList,
		canRestore,
		isLoading,
		isError,
		retry: query.refetch,
		busyIds,
		restore
	};
}
