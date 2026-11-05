'use client';

import { useCallback, useMemo } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import {
	canEditMemberRateOnProject,
	canManageProjectRates,
	holdsRateAdminPermission,
	rateValueOf
} from '@/core/lib/utils/rates';
import type { TOrganizationProject } from '@/core/types/schemas';
import { useProjectRateMutations, useProjectRates } from './use-rates';

/**
 * The rates of one project for its People tab. Only an organization admin or a manager of the project reads them
 * (Gauzy refuses anyone else); before the Gauzy rates are deployed the read answers 404 and the tab shows no rates.
 */
export function useProjectPeopleRates(project: TOrganizationProject) {
	const { data: user } = useUserQuery();
	const { myPermissions, isSuccess: permissionsLoaded } = useMyRolePermissionsQuery();
	const employeeId: string | null = user?.employee?.id ?? null;
	const canManage = canManageProjectRates({ permissions: myPermissions, members: project.members, employeeId });
	const readsRates = permissionsLoaded && canManage;
	const { data, isLoading, isError, isUnavailable, refetch } = useProjectRates(project.id, readsRates);
	const { saveProjectRate, saveMemberRate } = useProjectRateMutations(project.id);

	const memberRates = useMemo(() => {
		const rates = new Map<string, number | null>();
		for (const member of data?.members ?? []) {
			rates.set(member.employeeId, rateValueOf(member.billRateValue));
		}
		return rates;
	}, [data?.members]);

	const memberRateOf = useCallback(
		(memberEmployeeId: string) => memberRates.get(memberEmployeeId) ?? null,
		[memberRates]
	);

	const saveMemberRateOf = useCallback(
		(memberEmployeeId: string, billRateValue: number | null) =>
			saveMemberRate({ employeeId: memberEmployeeId, billRateValue }),
		[saveMemberRate]
	);

	const isAdmin = holdsRateAdminPermission(myPermissions);
	const canEditMemberRate = useCallback(
		(memberEmployeeId: string) =>
			canEditMemberRateOnProject({ isAdmin, callerEmployeeId: employeeId, memberEmployeeId }),
		[employeeId, isAdmin]
	);

	const showsRates = readsRates && !isUnavailable;
	const hasRates = showsRates && Boolean(data);
	const failed = showsRates && isError;
	const currency = data?.currency ?? project.currency ?? null;

	return {
		showsRates,
		hasRates,
		isLoading: showsRates && isLoading,
		failed,
		retry: refetch,
		projectRate: rateValueOf(data?.billRateValue),
		currency,
		memberRateOf,
		canEditMemberRate,
		saveProjectRate,
		saveMemberRateOf
	};
}
