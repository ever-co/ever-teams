'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlGroupRecipe } from '@/core/components/common/input';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import { History, Lock, Search, Task, Undo, UserAdd, UserRemove, Users } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { WorkspaceRole } from '@/core/lib/utils/member-access';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useInactiveMembers } from '@/core/hooks/settings/use-inactive-members';
import { useTeamMembersSettings, type MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { SETTINGS_SURFACE, SettingsSection } from '@/core/components/settings/kit/settings-page';
import { ConfirmMemberDialog } from './confirm-member-dialog';
import { InactiveMembersList } from './inactive-members-list';
import { MemberRow, type MemberRowActions } from './member-row';

const MIN_ROWS_FOR_SEARCH = 8;

type MembersFilter = 'active' | 'inactive';

function matchesQuery(person: Readonly<{ name: string; email: string }>, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return true;
	}
	const inName = person.name.toLowerCase().includes(needle);
	const inEmail = person.email.toLowerCase().includes(needle);
	return inName || inEmail;
}

function MemberSearch({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
	const t = useTranslations();
	const fieldId = useId();
	return (
		<div className={cn(controlGroupRecipe, 'h-8 max-w-xs gap-2 pl-2.5')}>
			<Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
			<label htmlFor={fieldId} className="sr-only">
				{t('settings.members.SEARCH_LABEL')}
			</label>
			<input
				id={fieldId}
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={t('settings.members.SEARCH_PLACEHOLDER')}
				autoComplete="off"
				className="min-w-0 flex-1 bg-transparent pr-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75"
			/>
		</div>
	);
}

function RemoveMemberDialog({
	member,
	teamName,
	onClose,
	onRemove
}: Readonly<{
	member: MemberRowModel | null;
	teamName: string;
	onClose: () => void;
	onRemove: (rowId: string) => Promise<void>;
}>) {
	const t = useTranslations();
	return (
		<ConfirmMemberDialog
			member={member}
			titleOf={(name) => t('settings.members.REMOVE_TITLE', { name, team: teamName })}
			consequencesOf={(name) => [
				{ key: 'list', icon: <UserRemove />, text: t('settings.members.REMOVE_CONSEQUENCE_LIST', { name }) },
				{ key: 'tasks', icon: <Task />, text: t('settings.members.REMOVE_CONSEQUENCE_TASKS') }
			]}
			confirmLabel={t('settings.members.REMOVE_CONFIRM')}
			onClose={onClose}
			onConfirm={onRemove}
		/>
	);
}

function DeactivateMemberDialog({
	member,
	canConfirm,
	onClose,
	onDeactivate
}: Readonly<{
	member: MemberRowModel | null;
	canConfirm: boolean;
	onClose: () => void;
	onDeactivate: (rowId: string) => Promise<void>;
}>) {
	const t = useTranslations();
	return (
		<ConfirmMemberDialog
			member={member}
			titleOf={(name) => t('settings.members.DEACTIVATE_TITLE', { name })}
			consequencesOf={(name) => [
				{ key: 'access', icon: <Lock />, text: t('settings.members.DEACTIVATE_CONSEQUENCE_ACCESS', { name }) },
				{ key: 'teams', icon: <Users />, text: t('settings.members.DEACTIVATE_CONSEQUENCE_TEAMS') },
				{ key: 'history', icon: <History />, text: t('settings.members.DEACTIVATE_CONSEQUENCE_HISTORY') },
				{ key: 'restore', icon: <Undo />, text: t('settings.members.DEACTIVATE_CONSEQUENCE_RESTORE') }
			]}
			confirmLabel={t('settings.members.DEACTIVATE')}
			confirmDisabled={!canConfirm}
			onClose={onClose}
			onConfirm={onDeactivate}
		/>
	);
}

function NoMatch({ query, onClear }: Readonly<{ query: string; onClear: () => void }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-[13px] text-muted-foreground">{t('settings.members.NO_MATCH', { query })}</p>
			<Button type="button" variant="outline" size="sm" onClick={onClear}>
				{t('settings.members.CLEAR_SEARCH')}
			</Button>
		</div>
	);
}

function NoMembers({ onInvite, canInvite }: Readonly<{ onInvite: () => void; canInvite: boolean }>) {
	const t = useTranslations();
	return (
		<div className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
			<p className="text-[13px] text-muted-foreground">{t('settings.members.NO_MEMBERS')}</p>
			<Button type="button" variant="outline" size="sm" onClick={onInvite} disabled={!canInvite}>
				<UserAdd />
				{t('common.INVITE')}
			</Button>
		</div>
	);
}

function ActiveMembersList({
	rows,
	visibleRows,
	query,
	assignableRoles,
	actions,
	canInvite,
	onInvite,
	onClearQuery
}: Readonly<{
	rows: ReadonlyArray<MemberRowModel>;
	visibleRows: ReadonlyArray<MemberRowModel>;
	query: string;
	assignableRoles: ReadonlyArray<WorkspaceRole>;
	actions: MemberRowActions;
	canInvite: boolean;
	onInvite: () => void;
	onClearQuery: () => void;
}>) {
	const t = useTranslations();
	const format = useFormatter();
	const formatJoined = useCallback(
		(date: Date) => t('settings.members.JOINED', { date: format.dateTime(date, { dateStyle: 'medium' }) }),
		[format, t]
	);
	const hasMembers = rows.length > 0;
	const hasVisibleRows = visibleRows.length > 0;

	if (!hasMembers) {
		return (
			<div className={SETTINGS_SURFACE}>
				<NoMembers onInvite={onInvite} canInvite={canInvite} />
			</div>
		);
	}
	if (!hasVisibleRows) {
		return (
			<div className={SETTINGS_SURFACE}>
				<NoMatch query={query} onClear={onClearQuery} />
			</div>
		);
	}

	return (
		<ul className={SETTINGS_SURFACE} aria-label={t('settings.members.MEMBERS_SECTION')}>
			{visibleRows.map((row) => (
				<MemberRow
					key={row.id}
					row={row}
					assignableRoles={assignableRoles}
					formatJoined={formatJoined}
					actions={actions}
				/>
			))}
		</ul>
	);
}

export function MembersSection({ onInvite, canInvite }: Readonly<{ onInvite: () => void; canInvite: boolean }>) {
	const t = useTranslations();
	const format = useFormatter();
	const {
		teamName,
		rows,
		assignableRoles,
		changeRole,
		changeWorkspaceRole,
		deactivateMember,
		removeMember,
		renameMember,
		setMemberTracking,
		saveMemberRates
	} = useTeamMembersSettings();
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState<MembersFilter>('active');
	const [removing, setRemoving] = useState<MemberRowModel | null>(null);
	const [deactivating, setDeactivating] = useState<MemberRowModel | null>(null);
	const mountsRemoveDialog = useHasBeenOpen(Boolean(removing));
	const mountsDeactivateDialog = useHasBeenOpen(Boolean(deactivating));
	const wantsInactive = filter === 'inactive';
	const inactive = useInactiveMembers(wantsInactive);

	const showsInactive = inactive.canList && wantsInactive;
	const visibleRows = useMemo(() => rows.filter((row) => matchesQuery(row, query)), [query, rows]);
	const visibleInactiveMembers = useMemo(
		() => inactive.members.filter((member) => matchesQuery(member, query)),
		[inactive.members, query]
	);
	let listedCount = rows.length;
	if (showsInactive) {
		listedCount = inactive.members.length;
	}
	const showsSearch = listedCount >= MIN_ROWS_FOR_SEARCH;
	const hasInactiveMembers = inactive.members.length > 0;
	const hasVisibleInactiveMembers = visibleInactiveMembers.length > 0;
	const hidesEveryInactiveMember = hasInactiveMembers && !hasVisibleInactiveMembers;
	const showsInactiveNoMatch = showsInactive && hidesEveryInactiveMember;
	const showsInactiveList = showsInactive && !hidesEveryInactiveMember;
	const deactivatingRow = rows.find((row) => row.id === deactivating?.id);
	const canConfirmDeactivation = Boolean(deactivatingRow?.canDeactivate);
	const clearQuery = () => setQuery('');

	const filters = useMemo<SegmentedControlItem<MembersFilter>[]>(
		() => [
			{ value: 'active', label: t('settings.members.FILTER_ACTIVE') },
			{ value: 'inactive', label: t('settings.members.FILTER_INACTIVE') }
		],
		[t]
	);

	const showFilter = (next: MembersFilter) => {
		setFilter(next);
		setQuery('');
	};

	const formatDeactivated = useCallback(
		(date: Date) => t('settings.members.DEACTIVATED_ON', { date: format.dateTime(date, { dateStyle: 'medium' }) }),
		[format, t]
	);

	const actions = useMemo<MemberRowActions>(
		() => ({
			onChangeRole: (rowId, role) => {
				void changeRole(rowId, role);
			},
			onChangeWorkspaceRole: (rowId, roleId) => {
				void changeWorkspaceRole(rowId, roleId);
			},
			onToggleTracking: (rowId, enabled) => {
				void setMemberTracking(rowId, enabled);
			},
			onRequestRemove: setRemoving,
			onRequestDeactivate: setDeactivating,
			onRename: renameMember,
			onSaveRates: saveMemberRates
		}),
		[changeRole, changeWorkspaceRole, renameMember, saveMemberRates, setMemberTracking]
	);

	const search = showsSearch && <MemberSearch value={query} onChange={setQuery} />;

	return (
		<SettingsSection
			id="members"
			title={t('settings.members.MEMBERS_SECTION')}
			description={t('settings.members.MEMBERS_COUNT', { count: rows.length })}
		>
			{inactive.canList && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<SegmentedControl
						items={filters}
						value={filter}
						onValueChange={showFilter}
						ariaLabel={t('settings.members.FILTER_LABEL')}
					/>
					{search}
				</div>
			)}
			{!inactive.canList && search}
			{!showsInactive && (
				<ActiveMembersList
					rows={rows}
					visibleRows={visibleRows}
					query={query}
					assignableRoles={assignableRoles}
					actions={actions}
					canInvite={canInvite}
					onInvite={onInvite}
					onClearQuery={clearQuery}
				/>
			)}
			{showsInactiveNoMatch && (
				<div className={SETTINGS_SURFACE}>
					<NoMatch query={query} onClear={clearQuery} />
				</div>
			)}
			{showsInactiveList && (
				<InactiveMembersList
					members={visibleInactiveMembers}
					isLoading={inactive.isLoading}
					isError={inactive.isError}
					canRestore={inactive.canRestore}
					busyIds={inactive.busyIds}
					formatDeactivated={formatDeactivated}
					onRetry={() => {
						void inactive.retry();
					}}
					onRestore={(member) => {
						void inactive.restore(member);
					}}
				/>
			)}
			{mountsRemoveDialog && (
				<RemoveMemberDialog
					member={removing}
					teamName={teamName}
					onClose={() => setRemoving(null)}
					onRemove={removeMember}
				/>
			)}
			{mountsDeactivateDialog && (
				<DeactivateMemberDialog
					member={deactivating}
					canConfirm={canConfirmDeactivation}
					onClose={() => setDeactivating(null)}
					onDeactivate={deactivateMember}
				/>
			)}
		</SettingsSection>
	);
}
