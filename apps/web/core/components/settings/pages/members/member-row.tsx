'use client';

import { FormEvent, KeyboardEvent, useId, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, MoreHorizontal, Pencil, Spinner, UserBlock, UserRemove, Wallet } from '@/core/components/icons';
import { ERoleName } from '@/core/types/generics/enums/role';
import { isTenantAdminRole } from '@/core/lib/utils/roles';
import { PROFILE_NAME_MAX_LENGTH } from '@/core/lib/utils/settings-profile';
import type { TeamRole } from '@/core/lib/utils/settings-team';
import type { WorkspaceRole } from '@/core/lib/utils/member-access';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import type { IEmployeeRatesInput } from '@/core/types/schemas/organization/rates.schema';
import { MemberRateEditor, MemberRateText } from './member-rate-editor';
import { MemberAvatar, PERSON_ROW, PersonChip, PersonLines } from './people-parts';

const ROLES: ReadonlyArray<TeamRole> = ['manager', 'member'];

const ROLE_LABEL_KEYS: Record<TeamRole, DottedLanguageObjectStringPaths> = {
	manager: 'settings.members.ROLE_MANAGER',
	member: 'settings.members.ROLE_MEMBER'
};

const ROLE_HINT_KEYS: Record<TeamRole, DottedLanguageObjectStringPaths> = {
	manager: 'settings.members.ROLE_MANAGER_HINT',
	member: 'settings.members.ROLE_MEMBER_HINT'
};

const WORKSPACE_ROLE_LABEL_KEYS: Partial<Record<string, DottedLanguageObjectStringPaths>> = {
	[ERoleName.SUPER_ADMIN]: 'settings.members.WORKSPACE_ROLE_SUPER_ADMIN',
	[ERoleName.ADMIN]: 'settings.members.WORKSPACE_ROLE_ADMIN',
	[ERoleName.MANAGER]: 'settings.members.WORKSPACE_ROLE_MANAGER',
	[ERoleName.EMPLOYEE]: 'settings.members.WORKSPACE_ROLE_EMPLOYEE',
	[ERoleName.DATA_ENTRY]: 'settings.members.WORKSPACE_ROLE_DATA_ENTRY',
	[ERoleName.VIEWER]: 'settings.members.WORKSPACE_ROLE_VIEWER',
	[ERoleName.CANDIDATE]: 'settings.members.WORKSPACE_ROLE_CANDIDATE',
	[ERoleName.INTERVIEWER]: 'settings.members.WORKSPACE_ROLE_INTERVIEWER'
};

type Translate = ReturnType<typeof useTranslations>;

/** A role the workspace created itself has no translation: it is shown as it was named. */
function workspaceRoleLabelOf(roleName: string, t: Translate): string {
	const labelKey = WORKSPACE_ROLE_LABEL_KEYS[roleName];
	if (!labelKey) {
		return roleName;
	}
	return t(labelKey);
}

export interface MemberRowActions {
	onChangeRole: (rowId: string, role: TeamRole) => void;
	onChangeWorkspaceRole: (rowId: string, roleId: string) => void;
	onToggleTracking: (rowId: string, enabled: boolean) => void;
	onRequestRemove: (row: MemberRowModel) => void;
	onRequestDeactivate: (row: MemberRowModel) => void;
	onRename: (rowId: string, firstName: string, lastName: string) => Promise<void>;
	onSaveRates: (rowId: string, rates: IEmployeeRatesInput) => Promise<void>;
}

function TeamRoleItems({
	row,
	onChangeRole
}: Readonly<{ row: MemberRowModel; onChangeRole: MemberRowActions['onChangeRole'] }>) {
	const t = useTranslations();
	return ROLES.map((role) => (
		<DropdownMenuItem
			key={role}
			onSelect={() => {
				if (role !== row.role) {
					onChangeRole(row.id, role);
				}
			}}
			className="items-start gap-3 py-2"
		>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-[13px] text-foreground">{t(ROLE_LABEL_KEYS[role])}</span>
				<span className="text-xs text-pretty text-muted-foreground">{t(ROLE_HINT_KEYS[role])}</span>
			</span>
			{role === row.role && <SelectedMark className="mt-0.5" />}
		</DropdownMenuItem>
	));
}

function WorkspaceRoleItems({
	row,
	assignableRoles,
	onChangeWorkspaceRole
}: Readonly<{
	row: MemberRowModel;
	assignableRoles: ReadonlyArray<WorkspaceRole>;
	onChangeWorkspaceRole: MemberRowActions['onChangeWorkspaceRole'];
}>) {
	const t = useTranslations();
	return assignableRoles.map((role) => (
		<DropdownMenuItem
			key={role.id}
			onSelect={() => {
				if (role.id !== row.workspaceRoleId) {
					onChangeWorkspaceRole(row.id, role.id);
				}
			}}
		>
			<span className="min-w-0 flex-1 truncate">{workspaceRoleLabelOf(role.name, t)}</span>
			{role.id === row.workspaceRoleId && <SelectedMark />}
		</DropdownMenuItem>
	));
}

function RoleControl({
	row,
	assignableRoles,
	onChangeRole,
	onChangeWorkspaceRole
}: Readonly<{
	row: MemberRowModel;
	assignableRoles: ReadonlyArray<WorkspaceRole>;
	onChangeRole: MemberRowActions['onChangeRole'];
	onChangeWorkspaceRole: MemberRowActions['onChangeWorkspaceRole'];
}>) {
	const t = useTranslations();
	const roleLabel = t(ROLE_LABEL_KEYS[row.role]);
	const changesSomeRole = row.canChangeRole || row.canChangeWorkspaceRole;

	if (!changesSomeRole) {
		return <span className="shrink-0 px-2.5 text-[13px] text-muted-foreground">{roleLabel}</span>;
	}

	const showsBothGroups = row.canChangeRole && row.canChangeWorkspaceRole;
	const isPending = row.isRolePending || row.isWorkspaceRolePending;
	const teamGroupLabel = t('settings.members.ROLE_GROUP_TEAM');
	const workspaceGroupLabel = t('settings.members.ROLE_GROUP_WORKSPACE');

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={isPending}
					aria-label={t('settings.members.ROLE_OF', { name: row.name, role: roleLabel })}
					className="shrink-0 text-[13px] font-normal text-muted-foreground"
				>
					{isPending && <Spinner className="size-3.5 animate-spin" />}
					{roleLabel}
					<ChevronDown aria-hidden="true" className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				{row.canChangeRole && (
					<DropdownMenuGroup aria-label={teamGroupLabel}>
						{showsBothGroups && <DropdownMenuLabel aria-hidden="true">{teamGroupLabel}</DropdownMenuLabel>}
						<TeamRoleItems row={row} onChangeRole={onChangeRole} />
					</DropdownMenuGroup>
				)}
				{showsBothGroups && <DropdownMenuSeparator />}
				{row.canChangeWorkspaceRole && (
					<DropdownMenuGroup aria-label={workspaceGroupLabel}>
						<DropdownMenuLabel aria-hidden="true">{workspaceGroupLabel}</DropdownMenuLabel>
						<WorkspaceRoleItems
							row={row}
							assignableRoles={assignableRoles}
							onChangeWorkspaceRole={onChangeWorkspaceRole}
						/>
					</DropdownMenuGroup>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function hasEditActions(row: MemberRowModel): boolean {
	return row.canEditName || row.canEditRate || row.showsTracking;
}

function hasExitActions(row: MemberRowModel): boolean {
	return row.canDeactivate || row.canRemove;
}

function hasMenuActions(row: MemberRowModel): boolean {
	return hasEditActions(row) || hasExitActions(row);
}

function RowMenu({
	row,
	onEditName,
	onEditRate,
	onToggleTracking,
	onRequestRemove,
	onRequestDeactivate
}: Readonly<{
	row: MemberRowModel;
	onEditName: () => void;
	onEditRate: () => void;
	onToggleTracking: MemberRowActions['onToggleTracking'];
	onRequestRemove: MemberRowActions['onRequestRemove'];
	onRequestDeactivate: MemberRowActions['onRequestDeactivate'];
}>) {
	const t = useTranslations();
	if (!hasMenuActions(row)) {
		return <span aria-hidden="true" className="size-7 shrink-0" />;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label={t('settings.members.ROW_MENU', { name: row.name })}
					className="shrink-0 text-muted-foreground"
				>
					<MoreHorizontal />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{row.canEditName && (
					<DropdownMenuItem onSelect={onEditName}>
						<Pencil />
						{t('settings.members.EDIT_NAME')}
					</DropdownMenuItem>
				)}
				{row.canEditRate && (
					<DropdownMenuItem onSelect={onEditRate}>
						<Wallet />
						{t('rates.EDIT_RATE')}
					</DropdownMenuItem>
				)}
				{row.showsTracking && (
					<DropdownMenuCheckboxItem
						checked={row.isTrackingEnabled}
						disabled={row.isTrackingPending || row.isTrackingLocked}
						onCheckedChange={(checked) => onToggleTracking(row.id, checked)}
					>
						<span className="flex flex-col">
							{t('settings.members.TRACK_TIME')}
							{row.isTrackingLocked && (
								<span className="text-xs text-muted-foreground">
									{t('settings.members.TRACKING_OFF_BY_ADMIN')}
								</span>
							)}
						</span>
					</DropdownMenuCheckboxItem>
				)}
				{hasExitActions(row) && <DropdownMenuSeparator />}
				{row.canDeactivate && (
					<DropdownMenuItem onSelect={() => onRequestDeactivate(row)}>
						<UserBlock />
						{t('settings.members.DEACTIVATE')}
					</DropdownMenuItem>
				)}
				{row.canRemove && (
					<DropdownMenuItem variant="destructive" onSelect={() => onRequestRemove(row)}>
						<UserRemove />
						{t('settings.members.REMOVE')}
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MemberNameEditor({
	row,
	onCancel,
	onRename
}: Readonly<{ row: MemberRowModel; onCancel: () => void; onRename: MemberRowActions['onRename'] }>) {
	const t = useTranslations();
	const firstNameId = useId();
	const lastNameId = useId();
	const errorId = useId();
	const [firstName, setFirstName] = useState(row.firstName);
	const [lastName, setLastName] = useState(row.lastName);
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const hasError = Boolean(error);

	const save = async (event: FormEvent) => {
		event.preventDefault();
		const trimmedFirstName = firstName.trim();
		const trimmedLastName = lastName.trim();
		if (!trimmedFirstName) {
			setError(t('settings.members.FIRST_NAME_REQUIRED'));
			return;
		}
		setIsSaving(true);
		try {
			await onRename(row.id, trimmedFirstName, trimmedLastName);
			onCancel();
		} catch {
			setError(t('settings.common.SAVE_FAILED'));
		} finally {
			setIsSaving(false);
		}
	};

	const cancelOnEscape = (event: KeyboardEvent<HTMLFormElement>) => {
		if (event.key !== 'Escape') {
			return;
		}
		event.stopPropagation();
		onCancel();
	};

	let describedBy: string | undefined = undefined;
	if (hasError) {
		describedBy = errorId;
	}

	return (
		<li>
			<form
				onSubmit={save}
				onKeyDown={cancelOnEscape}
				aria-label={t('settings.members.EDIT_NAME_OF', { name: row.name })}
				className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start"
			>
				<div className="hidden pt-0.5 sm:block">
					<MemberAvatar name={row.name} imageUrl={row.imageUrl} />
				</div>
				<div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
					<label htmlFor={firstNameId} className="sr-only">
						{t('settings.members.FIRST_NAME')}
					</label>
					<Input
						id={firstNameId}
						value={firstName}
						onChange={(event) => {
							setFirstName(event.target.value);
							setError(null);
						}}
						autoFocus
						autoComplete="off"
						maxLength={PROFILE_NAME_MAX_LENGTH}
						placeholder={t('settings.members.FIRST_NAME')}
						aria-invalid={hasError || undefined}
						aria-describedby={describedBy}
						className="h-8"
					/>
					<label htmlFor={lastNameId} className="sr-only">
						{t('settings.members.LAST_NAME')}
					</label>
					<Input
						id={lastNameId}
						value={lastName}
						onChange={(event) => {
							setLastName(event.target.value);
							setError(null);
						}}
						autoComplete="off"
						maxLength={PROFILE_NAME_MAX_LENGTH}
						placeholder={t('settings.members.LAST_NAME')}
						className="h-8"
					/>
					{error && (
						<p id={errorId} role="alert" className="text-xs text-destructive-ink sm:col-span-2">
							{error}
						</p>
					)}
				</div>
				<div className="flex shrink-0 justify-end gap-2">
					<Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
						{t('common.CANCEL')}
					</Button>
					<Button type="submit" size="sm" disabled={isSaving}>
						{isSaving && <Spinner className="size-3.5 animate-spin" />}
						{t('common.SAVE')}
					</Button>
				</div>
			</form>
		</li>
	);
}

type Formatter = (date: Date) => string;

/**
 * Only the admins are marked on the row: any other workspace role reads in the role menu, under its own heading,
 * where a workspace "Manager" cannot be taken for the manager of the team.
 */
function WorkspaceAdminChip({ roleName }: Readonly<{ roleName: string | null }>) {
	const t = useTranslations();
	if (!roleName) {
		return null;
	}
	if (!isTenantAdminRole(roleName)) {
		return null;
	}
	return <PersonChip hue="warning">{workspaceRoleLabelOf(roleName, t)}</PersonChip>;
}

export function MemberRow({
	row,
	assignableRoles,
	formatJoined,
	actions
}: Readonly<{
	row: MemberRowModel;
	assignableRoles: ReadonlyArray<WorkspaceRole>;
	formatJoined: Formatter;
	actions: MemberRowActions;
}>) {
	const t = useTranslations();
	const [editing, setEditing] = useState<'name' | 'rate' | null>(null);
	const stopEditing = () => setEditing(null);

	if (editing === 'name') {
		return <MemberNameEditor row={row} onCancel={stopEditing} onRename={actions.onRename} />;
	}
	if (editing === 'rate') {
		return <MemberRateEditor row={row} onCancel={stopEditing} onSaveRates={actions.onSaveRates} />;
	}

	const chips = (
		<>
			{row.isYou && <PersonChip hue="neutral">{t('settings.members.YOU')}</PersonChip>}
			<WorkspaceAdminChip roleName={row.workspaceRoleName} />
		</>
	);

	return (
		<li className={PERSON_ROW}>
			<MemberAvatar name={row.name} imageUrl={row.imageUrl} />
			<PersonLines name={row.name} detail={row.email} adornment={chips} />
			{row.joinedAt && (
				<span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums md:block">
					{formatJoined(row.joinedAt)}
				</span>
			)}
			<MemberRateText rate={row.rate} />
			<RoleControl
				row={row}
				assignableRoles={assignableRoles}
				onChangeRole={actions.onChangeRole}
				onChangeWorkspaceRole={actions.onChangeWorkspaceRole}
			/>
			<RowMenu
				row={row}
				onEditName={() => setEditing('name')}
				onEditRate={() => setEditing('rate')}
				onToggleTracking={actions.onToggleTracking}
				onRequestRemove={actions.onRequestRemove}
				onRequestDeactivate={actions.onRequestDeactivate}
			/>
		</li>
	);
}
