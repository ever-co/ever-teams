'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { activeTeamState, isTeamManagerMember, organizationTeamsState } from '@/core/stores';
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
	memberWorkspaceRoleIdOf,
	rosterWithout,
	rosterWithRole,
	teamRosterOf,
	teamsWithRenamedMember,
	type TeamRole
} from '@/core/lib/utils/settings-team';
import {
	assignableWorkspaceRolesOf,
	canChangeWorkspaceRole,
	canDeactivateMember,
	readsWorkspaceRoles,
	workspaceRoleNameOf,
	type WorkspaceRole
} from '@/core/lib/utils/member-access';
import { useSettings } from '@/core/hooks/users/use-settings';
import { useDeleteTask } from '@/core/hooks/organizations/teams/use-delete-task';
import { useEditOrganizationTeam } from '@/core/hooks/organizations/teams/use-edit-organization-team';
import { useGetActiveTeam } from '@/core/hooks/organizations/teams/use-get-active-team';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import { useMemberWorkEnd, useWorkspaceRoleAssignment } from '@/core/hooks/settings/use-member-access';
import { useMemberTrackingSwitch } from '@/core/hooks/settings/use-member-tracking-switch';
import { canMemberTrackTime } from '@/core/lib/helpers/team-member-tracking';
import { useEmployeeRatesMutation } from '@/core/hooks/organizations/rates/use-rates';
import { canEditMemberRates, employeeRateValueOf } from '@/core/lib/utils/rates';
import type { IEmployeeRatesInput } from '@/core/types/schemas/organization/rates.schema';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';

export interface MemberRate {
	value: number | null;
	currency: string | null;
	weeklyLimit: number | null;
}

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
	isTrackingLocked: boolean;
	isRolePending: boolean;
	isTrackingPending: boolean;
	rate: MemberRate;
	canEditRate: boolean;
	employeeId: string | null;
	workspaceRoleId: string | null;
	workspaceRoleName: string | null;
	canChangeWorkspaceRole: boolean;
	isWorkspaceRolePending: boolean;
	canDeactivate: boolean;
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
	return canMemberTrackTime(member);
}

// A team manager switches the member's tracking in this team; the employee's own switch is an organization admin's
function isTrackingLockedFor(member: TOrganizationTeamEmployee, writesEmployeeTracking: boolean): boolean {
	const isEmployeeTrackingOff = memberEmployeeOf(member)?.isTrackingEnabled === false;
	return isEmployeeTrackingOff && !writesEmployeeTracking;
}

function memberRateOf(member: TOrganizationTeamEmployee): MemberRate {
	const employee = memberEmployeeOf(member);
	const currency = employee?.billRateCurrency || null;
	return {
		value: employeeRateValueOf(employee?.billRateValue),
		currency,
		weeklyLimit: employeeRateValueOf(employee?.reWeeklyLimit)
	};
}

interface MemberAccessContext {
	userId: string | undefined;
	permissions: ReadonlyArray<string>;
	workspaceRoles: ReadonlyArray<WorkspaceRole>;
	assignableRoles: ReadonlyArray<WorkspaceRole>;
	workspaceRoleOverrides: Overrides<string>;
}

const NO_MEMBER_ACCESS = { canDeactivate: false, canChangeWorkspaceRole: false };

/** A role given to the member that the team data does not carry yet: it is being saved, or was not read back. */
function hasWorkspaceRoleOnItsWay(member: TOrganizationTeamEmployee, overrides: Overrides<string>): boolean {
	const rowId = member.id;
	if (!rowId) {
		return false;
	}
	const roleIdOnItsWay = overrides[rowId];
	if (!roleIdOnItsWay) {
		return false;
	}
	return roleIdOnItsWay !== memberWorkspaceRoleIdOf(member);
}

/**
 * What the viewer may do to a member's access, read from the role Gauzy stores and never from a change still on its
 * way: the list and the actions both go through it, so an action is checked again on the data of the moment. While
 * a change of role is on its way the member may already hold the new one, an admin's included, so Deactivate waits
 * until the team data carries it.
 */
function memberAccessOf(member: TOrganizationTeamEmployee, context: MemberAccessContext) {
	if (!context.userId) {
		return NO_MEMBER_ACCESS;
	}
	const memberUserId = memberUserIdOf(member);
	const isYou = memberUserId === context.userId;
	const workspaceRoleName = workspaceRoleNameOf(context.workspaceRoles, memberWorkspaceRoleIdOf(member));
	const isRoleSettled = !hasWorkspaceRoleOnItsWay(member, context.workspaceRoleOverrides);
	const mayDeactivate = canDeactivateMember({
		permissions: context.permissions,
		isYou,
		hasEmployee: Boolean(employeeIdOf(member)),
		workspaceRoleName
	});
	return {
		canDeactivate: mayDeactivate && isRoleSettled,
		canChangeWorkspaceRole: canChangeWorkspaceRole({
			isYou,
			hasUser: Boolean(memberUserId),
			workspaceRoleName,
			assignableRoles: context.assignableRoles
		})
	};
}

export function useTeamMembersSettings() {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const setTeams = useSetAtom(organizationTeamsState);
	const getActiveTeam = useGetActiveTeam();
	const { editOrganizationTeam } = useEditOrganizationTeam({ toastOnError: false });
	const { deleteEmployeeFromTasks } = useDeleteTask();
	const { updateAvatar } = useSettings();
	const { myPermissions } = useMyRolePermissionsQuery();
	const { isTrackingRuleKnown, mayTurnTracking, writesEmployeeTracking, saveMemberTracking } =
		useMemberTrackingSwitch();
	const { saveEmployeeRates } = useEmployeeRatesMutation();
	const { setMemberWorkEnd } = useMemberWorkEnd();
	const { assignWorkspaceRole } = useWorkspaceRoleAssignment();
	const { roles: workspaceRoles } = useRolesQuery({ enabled: readsWorkspaceRoles(myPermissions) });

	const [roleOverrides, setRoleOverrides] = useState<Overrides<TeamRole>>({});
	const [trackingOverrides, setTrackingOverrides] = useState<Overrides<boolean>>({});
	const [workspaceRoleOverrides, setWorkspaceRoleOverrides] = useState<Overrides<string>>({});
	const [pendingRoles, setPendingRoles] = useState<ReadonlySet<string>>(new Set());
	const [pendingTracking, setPendingTracking] = useState<ReadonlySet<string>>(new Set());
	const [pendingWorkspaceRoles, setPendingWorkspaceRoles] = useState<ReadonlySet<string>>(new Set());

	const members = useMemo(() => activeTeam?.members ?? [], [activeTeam?.members]);
	const userId = user?.id;
	const viewerRoleName = user?.role?.name;

	const assignableRoles = useMemo(
		() => assignableWorkspaceRolesOf({ viewerRoleName, permissions: myPermissions, roles: workspaceRoles }),
		[myPermissions, viewerRoleName, workspaceRoles]
	);
	const accessContext = useMemo<MemberAccessContext>(
		() => ({ userId, permissions: myPermissions, workspaceRoles, assignableRoles, workspaceRoleOverrides }),
		[assignableRoles, myPermissions, userId, workspaceRoleOverrides, workspaceRoles]
	);

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
		setWorkspaceRoleOverrides((current) =>
			withoutSettled(current, (rowId) => {
				const member = memberById.get(rowId);
				if (!member) {
					return undefined;
				}
				return memberWorkspaceRoleIdOf(member) ?? undefined;
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
			const employeeId = employeeIdOf(member);
			const hasEmployee = Boolean(employeeId);
			const role = roleOverrides[rowId] ?? roleOf(member);
			const isTrackingEnabled = trackingOverrides[rowId] ?? isTrackingEnabledOf(member);
			// Before the permissions load an admin would look like a team manager and save the team switch alone, and
			// before the organization is read nobody knows whether the ranks apply
			const isSavingTracking = pendingTracking.has(rowId);
			const waitsForPermissions = !isTrackingRuleKnown;
			const workspaceRoleId = workspaceRoleOverrides[rowId] ?? memberWorkspaceRoleIdOf(member);
			const access = memberAccessOf(member, accessContext);
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
				// Only a higher rank switches a member's tracking, an admin also an admin's (see useMemberTrackingSwitch)
				showsTracking: hasEmployee && mayTurnTracking(member),
				isTrackingEnabled,
				isTrackingLocked: isTrackingLockedFor(member, writesEmployeeTracking(member)),
				isRolePending: pendingRoles.has(rowId),
				isTrackingPending: isSavingTracking || waitsForPermissions,
				rate: memberRateOf(member),
				canEditRate: canEditMemberRates({ permissions: myPermissions, hasEmployee, isYou }),
				employeeId,
				workspaceRoleId,
				workspaceRoleName: workspaceRoleNameOf(workspaceRoles, workspaceRoleId),
				canChangeWorkspaceRole: access.canChangeWorkspaceRole,
				isWorkspaceRolePending: pendingWorkspaceRoles.has(rowId),
				canDeactivate: access.canDeactivate
			});
		}
		return models;
	}, [
		accessContext,
		isTrackingRuleKnown,
		mayTurnTracking,
		myPermissions,
		members,
		pendingRoles,
		pendingTracking,
		pendingWorkspaceRoles,
		roleOverrides,
		trackingOverrides,
		userId,
		workspaceRoleOverrides,
		workspaceRoles,
		writesEmployeeTracking
	]);

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
				const { team, member } = findMember(rowId);
				await saveMemberTracking(team, member, enabled);
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
		[findMember, saveMemberTracking]
	);

	const saveMemberRates = useCallback(
		async (rowId: string, rates: IEmployeeRatesInput) => {
			const { employeeId } = findMember(rowId);
			await saveEmployeeRates({ employeeId, rates });
		},
		[findMember, saveEmployeeRates]
	);

	const workspaceRoleTargetOf = useCallback(
		(rowId: string, roleId: string) => {
			const member = getActiveTeam()?.members?.find((candidate) => candidate.id === rowId);
			if (!member) {
				return null;
			}
			const memberUserId = memberUserIdOf(member);
			const isOfferedRole = assignableRoles.some((role) => role.id === roleId);
			const mayChangeRole = memberAccessOf(member, accessContext).canChangeWorkspaceRole;
			const isAllowed = isOfferedRole && mayChangeRole;
			if (!memberUserId || !isAllowed) {
				return null;
			}
			return { userId: memberUserId, name: memberNameOf(member) };
		},
		[accessContext, assignableRoles, getActiveTeam]
	);

	const changeWorkspaceRole = useCallback(
		async (rowId: string, roleId: string) => {
			const target = workspaceRoleTargetOf(rowId, roleId);
			if (!target) {
				return;
			}
			setWorkspaceRoleOverrides((current) => ({ ...current, [rowId]: roleId }));
			setPendingWorkspaceRoles((current) => new Set(current).add(rowId));
			try {
				await assignWorkspaceRole({ userId: target.userId, roleId });
			} catch (error) {
				setWorkspaceRoleOverrides((current) => withoutKey(current, rowId));
				showFailure('settings.members.WORKSPACE_ROLE_NOT_SAVED', { name: target.name }, error);
			} finally {
				setPendingWorkspaceRoles((current) => {
					const next = new Set(current);
					next.delete(rowId);
					return next;
				});
			}
		},
		[assignWorkspaceRole, showFailure, workspaceRoleTargetOf]
	);

	const deactivateMember = useCallback(
		async (rowId: string) => {
			const { team, member, employeeId } = findMember(rowId);
			const name = memberNameOf(member);
			const organizationId = team.organizationId;
			const tenantId = team.tenantId;
			const mayDeactivate = memberAccessOf(member, accessContext).canDeactivate;
			try {
				if (!mayDeactivate) {
					throw new Error('Member cannot be deactivated');
				}
				if (!organizationId || !tenantId) {
					throw new Error('Team without an organization');
				}
				const endWork = new Date().toISOString();
				await setMemberWorkEnd({ employeeId, organizationId, tenantId, endWork });
			} catch (error) {
				showFailure('settings.members.DEACTIVATE_FAILED', { name }, error);
				throw error;
			}
			toast.success(t('settings.members.DEACTIVATED', { name }));
		},
		[accessContext, findMember, setMemberWorkEnd, showFailure, t]
	);

	return {
		teamName: activeTeam?.name ?? '',
		rows,
		assignableRoles,
		changeRole,
		changeWorkspaceRole,
		deactivateMember,
		removeMember,
		renameMember,
		setMemberTracking,
		saveMemberRates
	};
}
