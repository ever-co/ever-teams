'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { activeTeamManagersState, activeTeamState, isTeamManagerMember, organizationTeamsState } from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { ERoleName } from '@/core/types/generics/enums/role';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	employeeIdOf,
	memberEmailOf,
	memberEmployeeOf,
	memberFirstNameOf,
	memberImageUrlOf,
	memberJoinedAtOf,
	memberLastNameOf,
	memberNameOf,
	memberUserIdOf,
	rosterWithout,
	rosterWithRole,
	teamRosterOf,
	teamsWithRenamedMember,
	type TeamRole
} from '@/core/lib/utils/settings-team';
import { useSettings } from '@/core/hooks/users/use-settings';
import { useEmployeeUpdate } from '@/core/hooks/organizations/employees/use-employee';
import { useDeleteTask } from '@/core/hooks/organizations/teams/use-delete-task';
import { useEditOrganizationTeam } from '@/core/hooks/organizations/teams/use-edit-organization-team';
import { useGetActiveTeam } from '@/core/hooks/organizations/teams/use-get-active-team';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TUpdateEmployee } from '@/core/types/schemas/organization/employee.schema';

export interface MemberRowModel {
	id: string;
	name: string;
	email: string;
	firstName: string;
	lastName: string;
	imageUrl: string | null;
	joinedAt: Date | null;
	role: TeamRole;
	isYou: boolean;
	canChangeRole: boolean;
	canRemove: boolean;
	canEditName: boolean;
	showsTracking: boolean;
	isTrackingEnabled: boolean;
	isRolePending: boolean;
	isTrackingPending: boolean;
}

type Overrides<T> = Readonly<Record<string, T>>;

function withoutKey<T>(overrides: Overrides<T>, key: string): Overrides<T> {
	const next = { ...overrides };
	delete next[key];
	return next;
}

function withoutSettled<T>(overrides: Overrides<T>, currentOf: (key: string) => T | undefined): Overrides<T> {
	let changed = false;
	const next: Record<string, T> = {};
	for (const [key, value] of Object.entries(overrides)) {
		const isSettled = currentOf(key) === value;
		if (isSettled) {
			changed = true;
			continue;
		}
		next[key] = value;
	}
	if (!changed) {
		return overrides;
	}
	return next;
}

function roleOf(member: TOrganizationTeamEmployee): TeamRole {
	if (isTeamManagerMember(member)) {
		return 'manager';
	}
	return 'member';
}

function isTrackingEnabledOf(member: TOrganizationTeamEmployee): boolean {
	return memberEmployeeOf(member)?.isTrackingEnabled ?? false;
}

export function useTeamMembersSettings() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const managers = useAtomValue(activeTeamManagersState);
	const setTeams = useSetAtom(organizationTeamsState);
	const getActiveTeam = useGetActiveTeam();
	const { editOrganizationTeam } = useEditOrganizationTeam({ toastOnError: false });
	const { deleteEmployeeFromTasks } = useDeleteTask();
	const { updateAvatar } = useSettings();
	const { updateEmployeeAsync } = useEmployeeUpdate();

	const [roleOverrides, setRoleOverrides] = useState<Overrides<TeamRole>>({});
	const [trackingOverrides, setTrackingOverrides] = useState<Overrides<boolean>>({});
	const [pendingRoles, setPendingRoles] = useState<ReadonlySet<string>>(new Set());
	const [pendingTracking, setPendingTracking] = useState<ReadonlySet<string>>(new Set());

	const members = useMemo(() => activeTeam?.members ?? [], [activeTeam?.members]);
	const userId = user?.id;
	const isListedManager = managers.some((manager) => memberUserIdOf(manager) === userId);

	useEffect(() => {
		const memberById = new Map(members.map((member) => [member.id ?? '', member]));
		setRoleOverrides((current) =>
			withoutSettled(current, (rowId) => {
				const member = memberById.get(rowId);
				if (!member) {
					return undefined;
				}
				return roleOf(member);
			})
		);
		setTrackingOverrides((current) =>
			withoutSettled(current, (rowId) => {
				const member = memberById.get(rowId);
				if (!member) {
					return undefined;
				}
				return isTrackingEnabledOf(member);
			})
		);
	}, [members]);

	const rows = useMemo<MemberRowModel[]>(() => {
		const models: MemberRowModel[] = [];
		for (const member of members) {
			const rowId = member.id;
			if (!rowId) {
				continue;
			}
			const memberUserId = memberUserIdOf(member);
			const isYou = memberUserId === userId;
			const hasEmployee = Boolean(employeeIdOf(member));
			const isManagerRole = member.role?.name === ERoleName.MANAGER;
			const role = roleOverrides[rowId] ?? roleOf(member);
			const isTrackingEnabled = trackingOverrides[rowId] ?? isTrackingEnabledOf(member);
			models.push({
				id: rowId,
				name: memberNameOf(member),
				email: memberEmailOf(member),
				firstName: memberFirstNameOf(member),
				lastName: memberLastNameOf(member),
				imageUrl: memberImageUrlOf(member),
				joinedAt: memberJoinedAtOf(member),
				role,
				isYou,
				canChangeRole: hasEmployee && !isYou,
				canRemove: hasEmployee && !isYou,
				canEditName: Boolean(memberUserId),
				showsTracking: isListedManager && !isManagerRole && hasEmployee,
				isTrackingEnabled,
				isRolePending: pendingRoles.has(rowId),
				isTrackingPending: pendingTracking.has(rowId)
			});
		}
		return models;
	}, [isListedManager, members, pendingRoles, pendingTracking, roleOverrides, trackingOverrides, userId]);

	const showFailure = useCallback(
		(titleKey: DottedLanguageObjectStringPaths, values: Record<string, string>, error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t(titleKey, values), { description: t(reasonKey) });
		},
		[t]
	);

	const findMember = useCallback(
		(rowId: string) => {
			const team = getActiveTeam();
			if (!team) {
				throw new Error('No active team');
			}
			const member = team.members?.find((candidate) => candidate.id === rowId);
			if (!member) {
				throw new Error('Member not found');
			}
			const employeeId = employeeIdOf(member);
			if (!employeeId) {
				throw new Error('Member without an employee');
			}
			return { team, member, employeeId };
		},
		[getActiveTeam]
	);

	const changeRole = useCallback(
		async (rowId: string, role: TeamRole) => {
			setRoleOverrides((current) => ({ ...current, [rowId]: role }));
			setPendingRoles((current) => new Set(current).add(rowId));
			let name = '';
			try {
				const { team, member, employeeId } = findMember(rowId);
				name = memberNameOf(member);
				const roster = rosterWithRole(teamRosterOf(team.members ?? [], isTeamManagerMember), employeeId, role);
				await editOrganizationTeam({ ...team, ...roster });
			} catch (error) {
				setRoleOverrides((current) => withoutKey(current, rowId));
				showFailure('settings.members.ROLE_NOT_SAVED', { name }, error);
			} finally {
				setPendingRoles((current) => {
					const next = new Set(current);
					next.delete(rowId);
					return next;
				});
			}
		},
		[editOrganizationTeam, findMember, showFailure]
	);

	const removeMember = useCallback(
		async (rowId: string) => {
			const { member, employeeId } = findMember(rowId);
			const name = memberNameOf(member);
			try {
				await deleteEmployeeFromTasks(employeeId);
			} catch (error) {
				// As before: the team update below still removes the member, and Gauzy unassigns their tasks itself
				logErrorInDev('Unassigning the removed member from the team tasks failed:', error);
			}
			const team = getActiveTeam();
			if (!team) {
				throw new Error('No active team');
			}
			const roster = rosterWithout(teamRosterOf(team.members ?? [], isTeamManagerMember), employeeId);
			try {
				await editOrganizationTeam({ ...team, ...roster });
			} catch (error) {
				showFailure('settings.members.REMOVE_FAILED', { name }, error);
				throw error;
			}
		},
		[deleteEmployeeFromTasks, editOrganizationTeam, findMember, getActiveTeam, showFailure]
	);

	const renameMember = useCallback(
		async (rowId: string, firstName: string, lastName: string) => {
			const { team, member } = findMember(rowId);
			const memberUserId = memberUserIdOf(member);
			if (!memberUserId) {
				throw new Error('Member without an account');
			}
			await updateAvatar({ firstName, lastName, id: memberUserId });
			setTeams((teams) => teamsWithRenamedMember(teams, team.id, rowId, firstName, lastName));
		},
		[findMember, setTeams, updateAvatar]
	);

	const setMemberTracking = useCallback(
		async (rowId: string, enabled: boolean) => {
			setTrackingOverrides((current) => ({ ...current, [rowId]: enabled }));
			setPendingTracking((current) => new Set(current).add(rowId));
			try {
				const { member, employeeId } = findMember(rowId);
				const employee = member.employee;
				const data: TUpdateEmployee = {
					isTrackingEnabled: enabled,
					id: employeeId,
					organizationId: employee?.organizationId,
					isActive: employee?.isActive,
					tenantId: employee?.tenantId
				};
				await updateEmployeeAsync({ id: employeeId, data });
				// The row reads the employee through the team: without this it keeps the old value
				await queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
			} catch {
				setTrackingOverrides((current) => withoutKey(current, rowId));
			} finally {
				setPendingTracking((current) => {
					const next = new Set(current);
					next.delete(rowId);
					return next;
				});
			}
		},
		[findMember, queryClient, updateEmployeeAsync]
	);

	return {
		teamName: activeTeam?.name ?? '',
		rows,
		changeRole,
		removeMember,
		renameMember,
		setMemberTracking
	};
}
