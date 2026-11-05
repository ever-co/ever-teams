'use client';

import { type FormEvent, useCallback, useId, useMemo, useRef, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { activeTeamState, canManageActiveTeamState } from '@/core/stores';
import { Info, Send, Spinner } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { AppDialog, APP_DIALOG_BODY, AppDialogDescription, AppDialogHeader } from '@/core/components/common/app-dialog';
import { EntityTile } from '@/core/components/common/entity-tile';
import { toastMoment } from '@/core/components/common/toast-moment';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { sendableEntries, type InviteEmailEntry, type InviteEmailState } from '@/core/lib/utils/invite-emails';
import { useInviteDialog, type InviteSendResult } from '@/core/hooks/invitations/use-invite-dialog';
import { useRemoveTeamInvitation } from '@/core/hooks/invitations/use-remove-team-invitation';
import { useSendTeamInvitation } from '@/core/hooks/invitations/use-send-team-invitation';
import { InviteEmailField } from './invite/invite-email-field';
import { InviteRoleSelect } from './invite/invite-role-select';
import { InvitePendingList, isOpenInvitation, type PendingInvitation } from './invite/invite-pending-list';

type Translate = ReturnType<typeof useTranslations>;

/** What the summary under the field says about the addresses that will not leave as a new invitation. */
const SUMMARY_KEYS: Partial<Record<InviteEmailState, DottedLanguageObjectStringPaths>> = {
	invalid: 'modals.invite.summary.INVALID',
	member: 'modals.invite.summary.MEMBER',
	pending: 'modals.invite.summary.PENDING'
};

const SUMMARY_ORDER: InviteEmailState[] = ['invalid', 'member', 'pending'];

function countByState(entries: readonly InviteEmailEntry[], state: InviteEmailState): number {
	return entries.filter((entry) => entry.state === state).length;
}

function InviteSummary({ entries }: Readonly<{ entries: InviteEmailEntry[] }>) {
	const t = useTranslations();
	const lines: { state: InviteEmailState; count: number }[] = [];
	for (const state of SUMMARY_ORDER) {
		const count = countByState(entries, state);
		if (count > 0) {
			lines.push({ state, count });
		}
	}
	if (lines.length === 0) {
		return null;
	}

	return (
		<ul className="flex flex-col gap-0.5 pl-5 text-xs text-muted-foreground">
			{lines.map((line) => (
				<li key={line.state} className={cn(line.state === 'invalid' && 'text-destructive-ink')}>
					{t(SUMMARY_KEYS[line.state] as DottedLanguageObjectStringPaths, { count: line.count })}
				</li>
			))}
		</ul>
	);
}

/** The address of a one-person invitation, for a toast that names them. */
function onlyEmailOf(entries: readonly InviteEmailEntry[]): string | null {
	const sendable = sendableEntries(entries);
	if (sendable.length !== 1) {
		return null;
	}

	return sendable[0].email;
}

function SendIcon({ isBusy }: Readonly<{ isBusy: boolean }>) {
	if (isBusy) {
		return <Spinner aria-hidden="true" className="animate-spin" />;
	}

	return <Send aria-hidden="true" />;
}

function announceSent(result: InviteSendResult, onlyEmail: string | null, t: Translate) {
	const total = result.invited + result.resent;
	if (onlyEmail) {
		toastMoment(t('toasts.invites.SENT', { email: onlyEmail }), <Send />, { id: 'invite-form-modal-success' });
		return;
	}
	const hasResent = result.resent > 0;
	toastMoment(t('toasts.invites.SENT_MANY', { count: total }), <Send />, {
		id: 'invite-form-modal-success',
		description: hasResent && t('toasts.invites.SENT_MANY_RESENT', { count: result.resent })
	});
}

function TeamContext() {
	const activeTeam = useAtomValue(activeTeamState);
	if (!activeTeam?.name) {
		return null;
	}

	return (
		<>
			<EntityTile
				name={activeTeam.name}
				color={activeTeam.color}
				imageUrl={activeTeam.image?.thumbUrl ?? activeTeam.image?.fullUrl}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{activeTeam.name}</span>
		</>
	);
}

/**
 * Invites people to the active team, Linear's way: several addresses in one field (typed or pasted), the role of
 * the batch for admins, the team's pending invitations below to send again or revoke. Gauzy needs addresses only:
 * the person types their own name when they accept.
 */
export function InviteFormModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const t = useTranslations();
	const canManageTeam = useAtomValue(canManageActiveTeamState);
	const dialog = useInviteDialog(open);
	const { resendTeamInvitation } = useSendTeamInvitation();
	const { removeTeamInvitation } = useRemoveTeamInvitation();
	const formRef = useRef<HTMLFormElement>(null);
	const summaryId = useId();
	const [errorKey, setErrorKey] = useState<string | null>(null);
	const { reset, send, entries, sendableCount } = dialog;

	const pendingInvitations = useMemo(
		() => (dialog.teamInvitations as PendingInvitation[]).filter(isOpenInvitation),
		[dialog.teamInvitations]
	);

	const close = useCallback(() => {
		reset();
		setErrorKey(null);
		closeModal();
	}, [closeModal, reset]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorKey(null);
		const onlyEmail = onlyEmailOf(entries);
		try {
			const result = await send();
			if (!result) {
				return;
			}
			announceSent(result, onlyEmail, t);
			close();
		} catch (error) {
			setErrorKey(errorReasonKeyOf(error));
		}
	};

	const submitFromShortcut = () => {
		// After the typed address became a chip, so the request carries it.
		window.requestAnimationFrame(() => formRef.current?.requestSubmit());
	};

	const resendInvitation = async (invitation: PendingInvitation) => {
		if (!invitation.id) {
			return;
		}
		await resendTeamInvitation(invitation.id);
		toastMoment(t('toasts.invites.SENT', { email: invitation.email ?? '' }), <Send />);
	};

	const revokeInvitation = async (invitation: PendingInvitation) => {
		if (!invitation.id) {
			return;
		}
		await removeTeamInvitation(invitation.id, invitation.email ?? undefined);
	};

	const isSendDisabled = sendableCount === 0 || dialog.isBusy;
	const isWaiting = dialog.prerequisitesPending;
	const hasRolesToPick = dialog.selectableRoles.length > 0;
	const showsRoleSelect = dialog.isAdmin && hasRolesToPick;

	const roleSelect = showsRoleSelect && (
		<InviteRoleSelect
			roles={dialog.selectableRoles}
			value={dialog.selectedRoleId}
			onChange={dialog.setSelectedRoleId}
			disabled={dialog.isBusy}
		/>
	);

	return (
		<AppDialog open={open} onClose={close} width="md" keepOpenOnOutsideClick>
			<AppDialogHeader title={t('modals.invite.TITLE')} context={<TeamContext />} onClose={close} />
			<div className={cn(APP_DIALOG_BODY, 'flex flex-col gap-6 pb-5')}>
				<form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2" autoComplete="off">
					<AppDialogDescription className="-mt-1 mb-1 text-[13px] text-muted-foreground">
						{t('modals.invite.DESCRIPTION')}
					</AppDialogDescription>
					<div className="flex items-start gap-2">
						<div className="min-w-0 flex-1">
							<InviteEmailField
								entries={entries}
								onAdd={dialog.addFromText}
								onRemove={dialog.removeEmail}
								onRemoveLast={dialog.removeLastEmail}
								isFull={dialog.isFull}
								onSubmitShortcut={submitFromShortcut}
								trailing={roleSelect}
								describedBy={summaryId}
							/>
						</div>
						<Button
							type="submit"
							size="lg"
							disabled={isSendDisabled}
							aria-busy={isWaiting}
							className="shrink-0"
						>
							<SendIcon isBusy={dialog.isBusy} />
							{t('common.INVITE')}
						</Button>
					</div>
					<div id={summaryId} className="flex flex-col gap-0.5">
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Info aria-hidden="true" className="size-3.5 shrink-0" />
							{t('modals.invite.FIELD_HINT')}
						</p>
						<InviteSummary entries={entries} />
						{errorKey && (
							<p role="alert" className="text-xs text-destructive-ink">
								{t('modals.invite.SEND_FAILED')} {t(errorKey as DottedLanguageObjectStringPaths)}
							</p>
						)}
					</div>
				</form>
				<InvitePendingList
					invitations={pendingInvitations}
					canRevoke={canManageTeam}
					onResend={resendInvitation}
					onRevoke={revokeInvitation}
				/>
			</div>
		</AppDialog>
	);
}
