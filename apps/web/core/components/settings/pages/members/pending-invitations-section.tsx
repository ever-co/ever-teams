'use client';

import { ReactNode, useState } from 'react';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Link, Send, Spinner, Trash, UserAdd } from '@/core/components/icons';
import { InvitationStateChip } from '@/core/components/features/teams/invite/invite-pending-list';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	invitationDateOf,
	invitationStateOf,
	type InvitationState,
	type PendingInvitation
} from '@/core/lib/utils/invitation-state';
import { useHasBeenOpen } from '@/core/hooks/common/use-has-been-open';
import { usePendingInvitationsSettings } from '@/core/hooks/settings/use-team-invitations-settings';
import { SETTINGS_SURFACE, SettingsSection } from '@/core/components/settings/kit/settings-page';
import { ConfirmDestructiveDialog } from '@/core/components/settings/kit/danger';
import { PeopleRowsSkeleton } from './members-settings-skeleton';
import { InvitedAvatar, PERSON_ROW, PersonLines, SectionCount } from './people-parts';

type Translate = ReturnType<typeof useTranslations>;

function datesLineOf(invitation: PendingInvitation, state: InvitationState, t: Translate): string {
	const parts: string[] = [];
	const sentOn = invitationDateOf(invitation.createdAt);
	const expiry = invitationDateOf(invitation.expireDate);
	if (sentOn) {
		parts.push(t('modals.invite.SENT_ON', { date: sentOn }));
	}
	const isExpired = state === 'expired';
	if (expiry && isExpired) {
		parts.push(t('modals.invite.EXPIRED_ON', { date: expiry }));
	}
	if (expiry && !isExpired) {
		parts.push(t('modals.invite.EXPIRES_ON', { date: expiry }));
	}
	return parts.join(' · ');
}

function detailLineOf(invitation: PendingInvitation, state: InvitationState, t: Translate): string {
	const dates = datesLineOf(invitation, state, t);
	const hasName = Boolean(invitation.fullName);
	if (!hasName) {
		return dates;
	}
	const parts = [invitation.email ?? '', dates].filter(Boolean);
	return parts.join(' · ');
}

function InvitationRow({
	invitation,
	now,
	isBusy,
	onResend,
	onRevoke
}: Readonly<{
	invitation: PendingInvitation;
	now: Date;
	isBusy: boolean;
	onResend: (invitation: PendingInvitation) => void;
	onRevoke: (invitation: PendingInvitation) => void;
}>) {
	const t = useTranslations();
	const email = invitation.email ?? '';
	const displayName = invitation.fullName || email;
	const state = invitationStateOf(invitation, now);

	let resendIcon = <Send />;
	if (isBusy) {
		resendIcon = <Spinner className="animate-spin" />;
	}

	return (
		<li className={PERSON_ROW}>
			<InvitedAvatar label={displayName} />
			<PersonLines
				name={displayName}
				detail={detailLineOf(invitation, state, t)}
				adornment={<InvitationStateChip state={state} />}
			/>
			<span className="flex shrink-0 items-center">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() => onResend(invitation)}
					disabled={isBusy}
					aria-label={t('modals.invite.RESEND', { email })}
					title={t('modals.invite.RESEND_HINT')}
					className="text-muted-foreground hover:text-foreground"
				>
					{resendIcon}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() => onRevoke(invitation)}
					disabled={isBusy}
					aria-label={t('modals.invite.REVOKE', { email })}
					title={t('modals.invite.REVOKE_CONFIRM')}
					className="text-muted-foreground hover:text-destructive-ink"
				>
					<Trash />
				</Button>
			</span>
		</li>
	);
}

function RevokeInvitationDialog({
	invitation,
	onClose,
	onRevoke
}: Readonly<{
	invitation: PendingInvitation | null;
	onClose: () => void;
	onRevoke: (invitation: PendingInvitation) => Promise<void>;
}>) {
	const t = useTranslations();
	const [shown, setShown] = useState<PendingInvitation | null>(invitation);
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Keep the address on screen while the dialog plays its closing transition
	if (invitation && invitation !== shown) {
		setShown(invitation);
	}
	const email = shown?.email ?? '';

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
			await onRevoke(shown);
			onClose();
		} catch (failure) {
			const reasonKey = errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths;
			setError(t(reasonKey));
		} finally {
			setIsPending(false);
		}
	};

	return (
		<ConfirmDestructiveDialog
			open={Boolean(invitation)}
			onClose={close}
			title={t('settings.members.REVOKE_TITLE', { email })}
			consequences={[
				{ key: 'link', icon: <Link />, text: t('settings.members.REVOKE_CONSEQUENCE_LINK') },
				{ key: 'again', icon: <UserAdd />, text: t('settings.members.REVOKE_CONSEQUENCE_AGAIN') }
			]}
			confirmLabel={t('modals.invite.REVOKE_CONFIRM')}
			isPending={isPending}
			error={error}
			onConfirm={() => {
				void confirm();
			}}
		/>
	);
}

function MessageRow({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className={SETTINGS_SURFACE}>
			<div className="flex flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
				{children}
			</div>
		</div>
	);
}

interface PendingInvitationsSectionProps {
	canInvite: boolean;
	onInvite: () => void;
}

export function PendingInvitationsSection({ canInvite, onInvite }: Readonly<PendingInvitationsSectionProps>) {
	const t = useTranslations();
	const { invitations, isLoading, isError, retry, busyIds, resend, revoke } = usePendingInvitationsSettings();
	const [now] = useState(() => new Date());
	const [revoking, setRevoking] = useState<PendingInvitation | null>(null);
	const mountsRevokeDialog = useHasBeenOpen(Boolean(revoking));
	const invitationCount = invitations.length;
	const hasInvitations = invitationCount > 0;
	const isSettled = !isLoading && !isError;
	let countBadge: ReactNode = null;
	if (isSettled) {
		countBadge = (
			<SectionCount
				count={invitationCount}
				label={t('settings.members.INVITATIONS_COUNT', { count: invitationCount })}
			/>
		);
	}

	let body = (
		<MessageRow>
			<p className="text-[13px] text-muted-foreground">{t('settings.members.INVITATIONS_EMPTY')}</p>
			<Button type="button" variant="outline" size="sm" onClick={onInvite} disabled={!canInvite}>
				<UserAdd />
				{t('common.INVITE')}
			</Button>
		</MessageRow>
	);
	if (hasInvitations) {
		body = (
			<ul className={SETTINGS_SURFACE} aria-label={t('settings.members.INVITATIONS_SECTION')}>
				{invitations.map((invitation) => (
					<InvitationRow
						key={invitation.id ?? invitation.email}
						invitation={invitation}
						now={now}
						isBusy={busyIds.has(invitation.id ?? '')}
						onResend={(target) => {
							void resend(target);
						}}
						onRevoke={setRevoking}
					/>
				))}
			</ul>
		);
	}
	if (isError) {
		body = (
			<Notice
				tone="error"
				title={t('settings.members.INVITATIONS_ERROR')}
				actions={
					<Button type="button" variant="outline" onClick={() => void retry()}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		);
	}
	if (isLoading) {
		body = <PeopleRowsSkeleton rows={2} trailingWidth="w-16" />;
	}

	return (
		<SettingsSection
			id="invitations"
			title={t('settings.members.INVITATIONS_SECTION')}
			description={t('settings.members.INVITATIONS_DESCRIPTION')}
			actions={countBadge}
		>
			{body}
			{mountsRevokeDialog && (
				<RevokeInvitationDialog invitation={revoking} onClose={() => setRevoking(null)} onRevoke={revoke} />
			)}
		</SettingsSection>
	);
}
