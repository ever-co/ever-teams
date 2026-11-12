'use client';

import { useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner, Undo } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { InactiveMember } from '@/core/lib/utils/member-access';
import { SETTINGS_SURFACE } from '@/core/components/settings/kit/settings-page';
import { PeopleRowsSkeleton } from './members-settings-skeleton';
import { MemberAvatar, PERSON_ROW, PersonLines } from './people-parts';

type Formatter = (date: Date) => string;

function detailOf(member: InactiveMember): string | undefined {
	const isNamedByEmail = member.email === member.name;
	if (isNamedByEmail) {
		return undefined;
	}
	return member.email;
}

function InactiveMemberRow({
	member,
	canRestore,
	isBusy,
	formatDeactivated,
	onRestore
}: Readonly<{
	member: InactiveMember;
	canRestore: boolean;
	isBusy: boolean;
	formatDeactivated: Formatter;
	onRestore: (member: InactiveMember) => void;
}>) {
	const t = useTranslations();

	let restoreIcon = <Undo />;
	if (isBusy) {
		restoreIcon = <Spinner className="animate-spin" />;
	}

	return (
		<li className={cn(PERSON_ROW, 'flex-wrap gap-y-2')}>
			<MemberAvatar name={member.name} imageUrl={member.imageUrl} />
			<PersonLines name={member.name} detail={detailOf(member)} className="basis-40" />
			{member.deactivatedAt && (
				<span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums md:block">
					{formatDeactivated(member.deactivatedAt)}
				</span>
			)}
			{canRestore && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => onRestore(member)}
					disabled={isBusy}
					aria-label={t('settings.members.RESTORE_MEMBER', { name: member.name })}
				>
					{restoreIcon}
					{t('settings.members.RESTORE')}
				</Button>
			)}
		</li>
	);
}

export function InactiveMembersList({
	members,
	isLoading,
	isError,
	canRestore,
	busyIds,
	formatDeactivated,
	onRetry,
	onRestore
}: Readonly<{
	members: ReadonlyArray<InactiveMember>;
	isLoading: boolean;
	isError: boolean;
	canRestore: boolean;
	busyIds: ReadonlySet<string>;
	formatDeactivated: Formatter;
	onRetry: () => void;
	onRestore: (member: InactiveMember) => void;
}>) {
	const t = useTranslations();

	if (isLoading) {
		return <PeopleRowsSkeleton rows={3} trailingWidth="w-16" />;
	}
	if (isError) {
		return (
			<Notice
				tone="error"
				title={t('settings.members.INACTIVE_ERROR')}
				actions={
					<Button type="button" variant="outline" onClick={onRetry}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		);
	}
	if (members.length === 0) {
		return (
			<div className={SETTINGS_SURFACE}>
				<p className="px-4 py-4 text-[13px] text-muted-foreground">{t('settings.members.INACTIVE_EMPTY')}</p>
			</div>
		);
	}

	return (
		<ul className={SETTINGS_SURFACE} aria-label={t('settings.members.INACTIVE_LIST')}>
			{members.map((member) => (
				<InactiveMemberRow
					key={member.employeeId}
					member={member}
					canRestore={canRestore}
					isBusy={busyIds.has(member.employeeId)}
					formatDeactivated={formatDeactivated}
					onRestore={onRestore}
				/>
			))}
		</ul>
	);
}
