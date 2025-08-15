'use client';

import { activeTeamManagersState, rolesState, userState } from '@/core/stores';
import NotFound from '@/core/components/pages/404';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { CommonToggle, Container, Divider, Text } from '@/core/components';
import { MainHeader, MainLayout } from '@/core/components/layouts/default-layout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/core/stores/common/full-width';
import { useIsMemberManager } from '@/core/hooks/organizations';
import { useRolePermissions } from '@/core/hooks/roles';
import { Breadcrumb } from '../../duplicated-components/breadcrumb';
import { EverCard } from '../../common/ever-card';
import { TRole } from '@/core/types/schemas';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';

const Permissions = () => {
	// Translations
	const t = useTranslations();

	// Global state
	const { data: user } = useUserQuery();
	const fullWidth = useAtomValue(fullWidthState);

	// Local state
	const [selectedRole, setSelectedRole] = useState<TRole | null>(null);

	// Hooks with data fetching
	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const { rolePermissionsFormated, getRolePermissions, updateRolePermission } = useRolePermissions();
	const { isTeamManager } = useIsMemberManager(user);
	const roles = useAtomValue(rolesState);

	// Memoized values
	const canAccessPermissions = useMemo(() => {
		return !(activeTeamManagers && activeTeamManagers.length && !isTeamManager);
	}, [activeTeamManagers, isTeamManager]);

	const selectedRoleId = useMemo(() => selectedRole?.id, [selectedRole]);

	// Effects
	useEffect(() => {
		if (selectedRoleId) {
			getRolePermissions(selectedRoleId);
		}
	}, [selectedRoleId, getRolePermissions]);

	// Callbacks
	const handleToggleRolePermission = useCallback(
		async (name: string) => {
			try {
				const permission = rolePermissionsFormated[name];
				if (!permission || !selectedRoleId) return;

				await updateRolePermission({
					...permission,
					enabled: !permission.enabled
				});

				getRolePermissions(selectedRoleId);
			} catch (error) {
				console.error('Failed to toggle role permission:', error);
			}
		},
		[rolePermissionsFormated, selectedRoleId, getRolePermissions, updateRolePermission]
	);

	if (!canAccessPermissions) {
		return (
			<MainLayout className="items-start">
				<NotFound />
			</MainLayout>
		);
	}

	return (
		<MainLayout className="items-start">
			<MainHeader>
				<Breadcrumb paths={['Dashboard', 'Roles & Permissions']} className="text-sm" />
			</MainHeader>
			<Container fullWidth={fullWidth} className="flex">
				<EverCard className="w-[90vw] h-[90vh] min-w-fit flex my-5 py-0 gap-8" shadow="custom">
					<div className="flex flex-col w-[35%] overflow-auto gap-2 mt-5">
						{roles.map((role) => (
							<div
								className={`flex items-center justify-between w-full py-2 px-5 rounded-xl cursor-pointer ${
									selectedRole && selectedRole.id === role.id
										? 'bg-primary dark:bg-primary-light text-white'
										: ''
								}`}
								key={role?.id}
								onClick={() => {
									setSelectedRole(role);
								}}
							>
								{role?.name}
							</div>
						))}
					</div>

					<Divider type="VERTICAL" />

					<div className="flex overflow-auto flex-col pt-3 pl-5 w-full">
						{selectedRole && (
							<div className="overflow-y-auto">
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.TRACK_TIME')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['TIME_TRACKER']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('TIME_TRACKER');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.ESTIMATE_ISSUE')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={
												(rolePermissionsFormated?.['ORG_TASK_ADD']?.enabled &&
													rolePermissionsFormated?.['ORG_TASK_EDIT']?.enabled) ||
												false
											}
											onChange={() => {
												handleToggleRolePermission('ORG_TASK_ADD');
												handleToggleRolePermission('ORG_TASK_EDIT');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.EPICS_CREATE_CLOSE')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={
												(rolePermissionsFormated?.['ORG_TASK_ADD']?.enabled &&
													rolePermissionsFormated?.['ORG_TASK_EDIT']?.enabled) ||
												false
											}
											onChange={() => {
												handleToggleRolePermission('ORG_TASK_ADD');
												handleToggleRolePermission('ORG_TASK_EDIT');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.ISSUE_CREATE_CLOSE')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={
												(rolePermissionsFormated?.['ORG_TASK_ADD']?.enabled &&
													rolePermissionsFormated?.['ORG_TASK_EDIT']?.enabled) ||
												false
											}
											onChange={() => {
												handleToggleRolePermission('ORG_TASK_ADD');
												handleToggleRolePermission('ORG_TASK_EDIT');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.ISSUE_ASSIGN_UNASSIGN')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={
												(rolePermissionsFormated?.['ORG_TASK_ADD']?.enabled &&
													rolePermissionsFormated?.['ORG_TASK_EDIT']?.enabled) ||
												false
											}
											onChange={() => {
												handleToggleRolePermission('ORG_TASK_ADD');
												handleToggleRolePermission('ORG_TASK_EDIT');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.INVITE_MEMBERS')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['ORG_INVITE_EDIT']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('ORG_INVITE_EDIT');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.REMOVE_MEMBERS')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={
												(rolePermissionsFormated?.['ORG_EMPLOYEES_EDIT']?.enabled &&
													rolePermissionsFormated?.['CHANGE_SELECTED_EMPLOYEE']?.enabled) ||
												false
											}
											onChange={() => {
												handleToggleRolePermission('ORG_EMPLOYEES_EDIT');
												handleToggleRolePermission('CHANGE_SELECTED_EMPLOYEE');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.HANDLE_REQUESTS')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={
												rolePermissionsFormated?.['ORG_TEAM_JOIN_REQUEST_EDIT']?.enabled ||
												false
											}
											onChange={() => {
												handleToggleRolePermission('ORG_TEAM_JOIN_REQUEST_EDIT');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.ROLES_POSITIONS_CHANGE')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['ORG_EMPLOYEES_EDIT']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('ORG_EMPLOYEES_EDIT');
											}}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.VIEW_DETAILS')}
									</Text>
									<div className="flex flex-row flex-grow-0 justify-between items-center w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['ORG_TASK_VIEW']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('ORG_TASK_VIEW');
											}}
										/>
									</div>
								</div>
							</div>
						)}
						{!selectedRole && <SelectRole />}
					</div>
				</EverCard>
			</Container>
		</MainLayout>
	);
};

function SelectRole() {
	const t = useTranslations();

	return (
		<div className="mt-28">
			<div className="m-auto w-[218px] h-[218px] rounded-full relative flex justify-center items-center text-center p-5 bg-[#6755c933] dark:bg-light--theme-light">
				<Text className="text-6xl font-semibold text-primary">!</Text>
			</div>

			<Text className="text-2xl font-normal text-center mt-10 text-[#282048] dark:text-light--theme">
				{t('common.SELECT_ROLE')}
			</Text>
		</div>
	);
}

export default withAuthentication(Permissions, {
	displayName: 'PermissionPage'
});
