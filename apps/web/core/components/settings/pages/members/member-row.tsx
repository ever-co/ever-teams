'use client';

import { FormEvent, KeyboardEvent, useId, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Input } from '@/core/components/common/input';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, MoreHorizontal, Pencil, Spinner, UserRemove } from '@/core/components/icons';
import { PROFILE_NAME_MAX_LENGTH } from '@/core/lib/utils/settings-profile';
import type { TeamRole } from '@/core/lib/utils/settings-team';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
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

export interface MemberRowActions {
	onChangeRole: (rowId: string, role: TeamRole) => void;
	onToggleTracking: (rowId: string, enabled: boolean) => void;
	onRequestRemove: (row: MemberRowModel) => void;
	onRename: (rowId: string, firstName: string, lastName: string) => Promise<void>;
}

function RoleControl({
	row,
	onChangeRole
}: Readonly<{ row: MemberRowModel; onChangeRole: MemberRowActions['onChangeRole'] }>) {
	const t = useTranslations();
	const roleLabel = t(ROLE_LABEL_KEYS[row.role]);

	if (!row.canChangeRole) {
		return <span className="shrink-0 px-2.5 text-[13px] text-muted-foreground">{roleLabel}</span>;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={row.isRolePending}
					aria-label={t('settings.members.ROLE_OF', { name: row.name, role: roleLabel })}
					className="shrink-0 text-[13px] font-normal text-muted-foreground"
				>
					{row.isRolePending && <Spinner className="size-3.5 animate-spin" />}
					{roleLabel}
					<ChevronDown aria-hidden="true" className="size-3.5" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				{ROLES.map((role) => (
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
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function hasMenuActions(row: MemberRowModel): boolean {
	return row.canEditName || row.showsTracking || row.canRemove;
}

function RowMenu({
	row,
	onEditName,
	onToggleTracking,
	onRequestRemove
}: Readonly<{
	row: MemberRowModel;
	onEditName: () => void;
	onToggleTracking: MemberRowActions['onToggleTracking'];
	onRequestRemove: MemberRowActions['onRequestRemove'];
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
				{row.showsTracking && (
					<DropdownMenuCheckboxItem
						checked={row.isTrackingEnabled}
						disabled={row.isTrackingPending}
						onCheckedChange={(checked) => onToggleTracking(row.id, checked)}
					>
						{t('settings.members.TRACK_TIME')}
					</DropdownMenuCheckboxItem>
				)}
				{row.canRemove && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem variant="destructive" onSelect={() => onRequestRemove(row)}>
							<UserRemove />
							{t('settings.members.REMOVE')}
						</DropdownMenuItem>
					</>
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

export function MemberRow({
	row,
	formatJoined,
	actions
}: Readonly<{ row: MemberRowModel; formatJoined: Formatter; actions: MemberRowActions }>) {
	const t = useTranslations();
	const [isEditing, setIsEditing] = useState(false);

	if (isEditing) {
		return <MemberNameEditor row={row} onCancel={() => setIsEditing(false)} onRename={actions.onRename} />;
	}

	const youChip = row.isYou && <PersonChip hue="neutral">{t('settings.members.YOU')}</PersonChip>;

	return (
		<li className={PERSON_ROW}>
			<MemberAvatar name={row.name} imageUrl={row.imageUrl} />
			<PersonLines name={row.name} detail={row.email} adornment={youChip} />
			{row.joinedAt && (
				<span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums md:block">
					{formatJoined(row.joinedAt)}
				</span>
			)}
			<RoleControl row={row} onChangeRole={actions.onChangeRole} />
			<RowMenu
				row={row}
				onEditName={() => setIsEditing(true)}
				onToggleTracking={actions.onToggleTracking}
				onRequestRemove={actions.onRequestRemove}
			/>
		</li>
	);
}
