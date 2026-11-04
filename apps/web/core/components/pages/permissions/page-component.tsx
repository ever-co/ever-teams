'use client';

import { activeTeamManagersState } from '@/core/stores';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import NotFound from '@/core/components/pages/404';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { CommonToggle, Text } from '@/core/components';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { useIsMemberManager } from '@/core/hooks/organizations';
import { useRolePermissionsQuery } from '@/core/hooks/roles/use-role-permissions-query';
import { useUpdateRolePermission } from '@/core/hooks/roles/use-update-role-permission';
import { Breadcrumb } from '../../duplicated-components/breadcrumb';
import { ShieldUser } from '@/core/components/icons';
import { TRole } from '@/core/types/schemas';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { clsxm } from '@/core/lib/utils';
import {
	PERMISSIONS_GRID,
	PermissionsPageSkeleton,
	PermissionsToolbar,
	ROLE_LIST,
	RoleListSkeleton,
	SelectRolePrompt
} from './permissions-page-skeleton';

const ROLE_ITEM =
	'flex h-8 w-full shrink-0 cursor-pointer items-center rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground';
const ROLE_ITEM_ACTIVE = 'bg-foreground/5 font-medium text-foreground';
const PERMISSION_ROW = 'flex w-full items-center justify-between gap-6 py-1';
const PERMISSION_LABEL = 'min-w-0 text-sm font-medium text-foreground';
const PERMISSION_CONTROL = 'flex shrink-0 items-center';

const Permissions = () => {
	// Translations
	const t = useTranslations();

	// Global state
	const { data: user } = useUserQuery();

	// Local state
	const [selectedRole, setSelectedRole] = useState<TRole | null>(null);

	// Hooks with data fetching
	const activeTeamManagers = useAtomValue(activeTeamManagersState);
	const selectedRoleId = selectedRole?.id;
	const { rolePermissionsFormated, isLoading: isRolePermissionsLoading } = useRolePermissionsQuery(selectedRoleId);
	const { updateRolePermission } = useUpdateRolePermission(selectedRoleId);
	const { isTeamManager } = useIsMemberManager(user);
	const { roles, isLoading: isRolesLoading } = useRolesQuery({ adminOnly: true });

	// Memoized values
	const canAccessPermissions = useMemo(() => {
		return !(activeTeamManagers && activeTeamManagers.length && !isTeamManager);
	}, [activeTeamManagers, isTeamManager]);

	// Callbacks
	const handleToggleRolePermission = useCallback(
		(name: string) => {
			const permission = rolePermissionsFormated[name];
			if (!permission || !selectedRoleId) return;

			updateRolePermission({
				...permission,
				enabled: !permission.enabled
			});
		},
		[rolePermissionsFormated, selectedRoleId, updateRolePermission]
	);

	if (!canAccessPermissions) {
		return (
			<PageLayout className="items-start">
				<NotFound
					labels={{
						title: t('pages.page404.HEADING_TITLE'),
						description: t('pages.page404.HEADING_DESCRIPTION'),
						action: t('pages.taskDetails.GO_BACK_HOME')
					}}
				/>
			</PageLayout>
		);
	}

	return (
		<PageLayout
			className="items-start"
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<ShieldUser className="size-4 shrink-0 text-muted-foreground" />
					<Breadcrumb
						paths={[t('sidebar.DASHBOARD'), t('pages.permissions.TITLE')]}
						className="min-w-0 text-sm"
					/>
				</div>
			}
			mainHeaderSlot={<PermissionsToolbar isUpdating={isRolePermissionsLoading} />}
		>
			<div className={PERMISSIONS_GRID}>
				<div className={ROLE_LIST}>
					{isRolesLoading && <RoleListSkeleton />}
					{roles.map((role) => {
						const isSelected = Boolean(selectedRole) && selectedRole?.id === role.id;
						return (
							<div
								className={clsxm(ROLE_ITEM, isSelected && ROLE_ITEM_ACTIVE)}
								key={role?.id}
								onClick={() => {
									setSelectedRole(role);
								}}
							>
								{role?.name}
							</div>
						);
					})}
				</div>

				<div className="flex w-full min-w-0 flex-col">
					{selectedRole && (
						<div className="flex flex-col hairline-divide-y divide-border">
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.TRACK_TIME')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
										enabled={rolePermissionsFormated?.['TIME_TRACKER']?.enabled || false}
										onChange={() => {
											handleToggleRolePermission('TIME_TRACKER');
										}}
									/>
								</div>
							</div>
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.ESTIMATE_ISSUE')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
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
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.EPICS_CREATE_CLOSE')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
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
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.ISSUE_CREATE_CLOSE')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
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
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>
									{t('pages.settingsTeam.ISSUE_ASSIGN_UNASSIGN')}
								</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
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
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.INVITE_MEMBERS')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
										enabled={rolePermissionsFormated?.['ORG_INVITE_EDIT']?.enabled || false}
										onChange={() => {
											handleToggleRolePermission('ORG_INVITE_EDIT');
										}}
									/>
								</div>
							</div>
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.REMOVE_MEMBERS')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
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
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.HANDLE_REQUESTS')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
										enabled={
											rolePermissionsFormated?.['ORG_TEAM_JOIN_REQUEST_EDIT']?.enabled || false
										}
										onChange={() => {
											handleToggleRolePermission('ORG_TEAM_JOIN_REQUEST_EDIT');
										}}
									/>
								</div>
							</div>
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>
									{t('pages.settingsTeam.ROLES_POSITIONS_CHANGE')}
								</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
										enabled={rolePermissionsFormated?.['ORG_EMPLOYEES_EDIT']?.enabled || false}
										onChange={() => {
											handleToggleRolePermission('ORG_EMPLOYEES_EDIT');
										}}
									/>
								</div>
							</div>
							<div className={PERMISSION_ROW}>
								<Text className={PERMISSION_LABEL}>{t('pages.settingsTeam.VIEW_DETAILS')}</Text>
								<div className={PERMISSION_CONTROL}>
									<CommonToggle
										enabledText={t('common.ACTIVATED')}
										disabledText={t('common.DEACTIVATED')}
										enabled={rolePermissionsFormated?.['ORG_TASK_VIEW']?.enabled || false}
										onChange={() => {
											handleToggleRolePermission('ORG_TASK_VIEW');
										}}
									/>
								</div>
							</div>
						</div>
					)}
					{!selectedRole && <SelectRolePrompt />}
				</div>
			</div>
		</PageLayout>
	);
};

export default withAuthentication(Permissions, {
	displayName: 'PermissionPage',
	skeleton: PermissionsPageSkeleton
});
