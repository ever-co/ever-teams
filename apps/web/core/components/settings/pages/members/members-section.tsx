'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import { useFormatter, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Search, Task, UserAdd, UserRemove } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { useTeamMembersSettings, type MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { SETTINGS_SURFACE, SettingsSection } from '@/core/components/settings/kit/settings-page';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { MemberRow, type MemberRowActions } from './member-row';
import { MemberAvatar, PersonLines } from './people-parts';

const MIN_ROWS_FOR_SEARCH = 8;

function matchesQuery(row: MemberRowModel, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) {
		return true;
	}
	const inName = row.name.toLowerCase().includes(needle);
	const inEmail = row.email.toLowerCase().includes(needle);
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
	const [shown, setShown] = useState<MemberRowModel | null>(member);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Keep the last member on screen while the dialog plays its closing transition
	if (member && member !== shown) {
		setShown(member);
	}
	const isOpen = Boolean(member);
	const name = shown?.name ?? '';

	const close = () => {
		setError(null);
		onClose();
	};

	const confirm = async () => {
		if (!shown) {
			return;
		}
		setIsPending(true);
		setError(null);
		try {
			await onRemove(shown.id);
			onClose();
		} catch (failure) {
			const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
			setError(t(reasonKey));
		} finally {
			setIsPending(false);
		}
	};

	const subject = shown && (
		<div className="flex items-center gap-3 rounded-xl px-1">
			<MemberAvatar name={shown.name} imageUrl={shown.imageUrl} />
			<PersonLines name={shown.name} detail={shown.email} />
		</div>
	);

	return (
		<ConfirmDestructiveDialog
			open={isOpen}
			onClose={close}
			title={t('settings.members.REMOVE_TITLE', { name, team: teamName })}
			subject={subject}
			consequences={[
				{ key: 'list', icon: <UserRemove />, text: t('settings.members.REMOVE_CONSEQUENCE_LIST', { name }) },
				{ key: 'tasks', icon: <Task />, text: t('settings.members.REMOVE_CONSEQUENCE_TASKS') }
			]}
			confirmLabel={t('settings.members.REMOVE_CONFIRM')}
			isPending={isPending}
			error={error}
			onConfirm={() => {
				void confirm();
			}}
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

export function MembersSection({ onInvite, canInvite }: Readonly<{ onInvite: () => void; canInvite: boolean }>) {
	const t = useTranslations();
	const format = useFormatter();
	const { teamName, rows, changeRole, removeMember, renameMember, setMemberTracking, saveMemberRates } =
		useTeamMembersSettings();
	const [query, setQuery] = useState('');
	const [removing, setRemoving] = useState<MemberRowModel | null>(null);
	const mountsRemoveDialog = useHasBeenOpen(Boolean(removing));

	const showsSearch = rows.length >= MIN_ROWS_FOR_SEARCH;
	const visibleRows = useMemo(() => rows.filter((row) => matchesQuery(row, query)), [query, rows]);
	const hasMembers = rows.length > 0;
	const hasVisibleRows = visibleRows.length > 0;

	const formatJoined = useCallback(
		(date: Date) => t('settings.members.JOINED', { date: format.dateTime(date, { dateStyle: 'medium' }) }),
		[format, t]
	);

	const actions = useMemo<MemberRowActions>(
		() => ({
			onChangeRole: (rowId, role) => {
				void changeRole(rowId, role);
			},
			onToggleTracking: (rowId, enabled) => {
				void setMemberTracking(rowId, enabled);
			},
			onRequestRemove: setRemoving,
			onRename: renameMember,
			onSaveRates: saveMemberRates
		}),
		[changeRole, renameMember, saveMemberRates, setMemberTracking]
	);

	let body = <NoMembers onInvite={onInvite} canInvite={canInvite} />;
	if (hasMembers) {
		body = <NoMatch query={query} onClear={() => setQuery('')} />;
	}
	if (hasVisibleRows) {
		body = (
			<ul className={SETTINGS_SURFACE} aria-label={t('settings.members.MEMBERS_SECTION')}>
				{visibleRows.map((row) => (
					<MemberRow key={row.id} row={row} formatJoined={formatJoined} actions={actions} />
				))}
			</ul>
		);
	}
	const isMessage = !hasVisibleRows;

	return (
		<SettingsSection
			id="members"
			title={t('settings.members.MEMBERS_SECTION')}
			description={t('settings.members.MEMBERS_COUNT', { count: rows.length })}
		>
			{showsSearch && <MemberSearch value={query} onChange={setQuery} />}
			{isMessage && <div className={SETTINGS_SURFACE}>{body}</div>}
			{!isMessage && body}
			{mountsRemoveDialog && (
				<RemoveMemberDialog
					member={removing}
					teamName={teamName}
					onClose={() => setRemoving(null)}
					onRemove={removeMember}
				/>
			)}
		</SettingsSection>
	);
}
