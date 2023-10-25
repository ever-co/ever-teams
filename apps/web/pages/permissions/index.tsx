import { useIsMemberManager, useOrganizationTeams, useRolePermissions } from '@app/hooks';
import { useRoles } from '@app/hooks/features/useRoles';
import { IRole } from '@app/interfaces';
import { userState } from '@app/stores';
import NotFound from '@components/pages/404';
import { withAuthentication } from 'lib/app/authenticator';
import { Breadcrumb, Card, CommonToggle, Container, Divider, Text } from 'lib/components';
import { MainHeader, MainLayout } from 'lib/layout';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';

const Permissions = () => {
	const { t } = useTranslation();
	const { activeTeamManagers } = useOrganizationTeams();
	const { rolePermissionsFormated, getRolePermissions, updateRolePermission } = useRolePermissions();

	const [selectedRole, setSelectedRole] = useState<IRole | null>(null);

	const [user] = useRecoilState(userState);
	const { isTeamManager } = useIsMemberManager(user);

	useEffect(() => {
		selectedRole && selectedRole?.id && getRolePermissions(selectedRole.id);
	}, [selectedRole, getRolePermissions]);

	const { getRoles, roles } = useRoles();
	useEffect(() => {
		getRoles();
	}, [getRoles]);

	const handleToggleRolePermission = useCallback(
		(name: string) => {
			const permission = rolePermissionsFormated[name];

			updateRolePermission({
				...permission,
				enabled: !permission.enabled
			}).then(() => {
				selectedRole && selectedRole?.id && getRolePermissions(selectedRole.id);
			});
		},
		[rolePermissionsFormated, selectedRole, getRolePermissions, updateRolePermission]
	);

	if (activeTeamManagers && activeTeamManagers.length && !isTeamManager) {
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
			<Container className="flex">
				<Card className="w-[90vw] h-[90vh] min-w-fit flex my-5 py-0 gap-8" shadow="custom">
					<div className="flex flex-col w-[35%] overflow-scroll gap-2 mt-5">
						{roles.map((role) => (
							<div
								className={`flex items-center justify-between w-full py-2 px-5 rounded-xl cursor-pointer ${
									selectedRole && selectedRole.id === role.id
										? 'bg-primary dark:bg-primary-light text-white'
										: ''
								}`}
								key={role.id}
								onClick={() => {
									setSelectedRole(role);
								}}
							>
								{role?.name}
							</div>
						))}
					</div>

					<Divider type="VERTICAL" />

					<div className="flex flex-col w-full pt-3 pl-5 overflow-scroll">
						{selectedRole && (
							<div className="overflow-y-scroll">
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.TRACK_TIME')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['TIME_TRACKER']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('TIME_TRACKER');
											}}
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										Estimate issue
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
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
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.EPICS_CREATE_CLOSE')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
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
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.ISSUE_CREATE_CLOSE')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
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
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.ISSUE_ASSIGN_UNASSIGN')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
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
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.INVITE_MEMBERS')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['ORG_INVITE_EDIT']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('ORG_INVITE_EDIT');
											}}
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.REMOVE_MEMBERS')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
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
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.HANDLE_REQUESTS')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
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
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.ROLES_POSITIONS_CHANGE')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['ORG_EMPLOYEES_EDIT']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('ORG_EMPLOYEES_EDIT');
											}}
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
								<div className="flex w-full items-center justify-between gap-[2rem]">
									<Text className="flex-none flex-grow-0 w-1/2 text-base font-normal text-gray-400 md-2">
										{t('pages.settingsTeam.VIEW_DETAILS')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-full">
										<CommonToggle
											enabledText="Activated"
											disabledText="Deactivated"
											enabled={rolePermissionsFormated?.['ORG_TASK_VIEW']?.enabled || false}
											onChange={() => {
												handleToggleRolePermission('ORG_TASK_VIEW');
											}}
											disabled={selectedRole ? false : true}
										/>
									</div>
								</div>
							</div>
						)}
						{!selectedRole && <SelectRole />}
					</div>
				</Card>
			</Container>
		</MainLayout>
	);
};

function SelectRole() {
	return (
		<div className="mt-28">
			<div className="m-auto w-[218px] h-[218px] rounded-full relative flex justify-center items-center text-center p-5 bg-[#6755c933] dark:bg-light--theme-light">
				<Text className="text-6xl font-semibold text-primary">!</Text>
			</div>

			<Text className="text-2xl font-normal text-center mt-10 text-[#282048] dark:text-light--theme">
				Please Select any Role
			</Text>
		</div>
	);
}

export default withAuthentication(Permissions, {
	displayName: 'PermissionPage'
});
