'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Alert, ChevronDown, Clock, Send, Trash, X } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
import { commandKeycapClass } from '@/core/components/common/command';
import { hueStyle, type GlyphHue } from '@/core/components/common/value-glyphs';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { cn } from '@/core/lib/helpers';
import {
	invitationDateOf as dateOf,
	invitationStateOf as stateOf,
	type InvitationState,
	type PendingInvitation
} from '@/core/lib/utils/invitation-state';

export { isOpenInvitation, type PendingInvitation } from '@/core/lib/utils/invitation-state';

const SHOWN_INVITATIONS = 4;
const REVOKE_ARMED_MS = 4000;

const STATE_LOOK: Record<
	InvitationState,
	{ labelKey: DottedLanguageObjectStringPaths; hue: GlyphHue; icon: ReactNode }
> = {
	pending: { labelKey: 'modals.invite.PENDING_STATUS', hue: 'warning', icon: <Clock /> },
	expired: { labelKey: 'modals.invite.EXPIRED_STATUS', hue: 'destructive', icon: <Alert /> },
	declined: { labelKey: 'modals.invite.DECLINED_STATUS', hue: 'neutral', icon: <X /> }
};

type Translate = ReturnType<typeof useTranslations>;

function detailLineOf(invitation: PendingInvitation, state: InvitationState, t: Translate): string {
	const parts: string[] = [];
	if (invitation.fullName && invitation.email) {
		parts.push(invitation.email);
	}
	const expiry = dateOf(invitation.expireDate);
	const sentOn = dateOf(invitation.createdAt);
	if (expiry && state === 'expired') {
		parts.push(t('modals.invite.EXPIRED_ON', { date: expiry }));
	} else if (expiry) {
		parts.push(t('modals.invite.EXPIRES_ON', { date: expiry }));
	} else if (sentOn) {
		parts.push(t('modals.invite.SENT_ON', { date: sentOn }));
	}

	return parts.join(' · ');
}

export function InvitationStateChip({ state }: Readonly<{ state: InvitationState }>) {
	const t = useTranslations();
	const look = STATE_LOOK[state];

	return (
		<span
			style={hueStyle(look.hue)}
			className="chip-3d inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium [&_svg]:size-3"
		>
			{look.icon}
			{t(look.labelKey)}
		</span>
	);
}

function RevokeButton({ email, onRevoke }: Readonly<{ email: string; onRevoke: () => void }>) {
	const t = useTranslations();
	const [isArmed, setIsArmed] = useState(false);

	useEffect(() => {
		if (!isArmed) {
			return;
		}
		const timer = window.setTimeout(() => setIsArmed(false), REVOKE_ARMED_MS);

		return () => window.clearTimeout(timer);
	}, [isArmed]);

	if (isArmed) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onRevoke}
				onBlur={() => setIsArmed(false)}
				autoFocus
				className="text-destructive-ink hover:bg-destructive/10"
			>
				{t('modals.invite.REVOKE_CONFIRM')}
			</Button>
		);
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={() => setIsArmed(true)}
			aria-label={t('modals.invite.REVOKE', { email })}
			title={t('modals.invite.REVOKE', { email })}
			className="text-muted-foreground hover:text-destructive-ink"
		>
			<Trash />
		</Button>
	);
}

function InvitationRow({
	invitation,
	now,
	isBusy,
	canRevoke,
	onResend,
	onRevoke
}: Readonly<{
	invitation: PendingInvitation;
	now: Date;
	isBusy: boolean;
	canRevoke: boolean;
	onResend: (invitation: PendingInvitation) => void;
	onRevoke: (invitation: PendingInvitation) => void;
}>) {
	const t = useTranslations();
	const email = invitation.email ?? '';
	const displayName = invitation.fullName || email;
	const state = stateOf(invitation, now);
	const detailLine = detailLineOf(invitation, state, t);
	const resendLabel = t('modals.invite.RESEND', { email });

	return (
		<li
			className={cn(
				'flex min-h-14 items-center gap-3 py-2 pl-3 pr-1.5 transition-opacity',
				isBusy && 'opacity-60'
			)}
		>
			<PersonAvatar person={{ id: email, name: displayName, imageUrl: null }} size="md" className="ring-0" />
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-[13px] font-medium leading-tight text-foreground">{displayName}</span>
				{detailLine && (
					<span className="truncate text-xs leading-tight text-muted-foreground">{detailLine}</span>
				)}
			</span>
			<InvitationStateChip state={state} />
			<span className="flex shrink-0 items-center">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					onClick={() => onResend(invitation)}
					disabled={isBusy}
					aria-label={resendLabel}
					title={t('modals.invite.RESEND_HINT')}
					className="text-muted-foreground hover:text-foreground"
				>
					<Send />
				</Button>
				{canRevoke && <RevokeButton email={email} onRevoke={() => onRevoke(invitation)} />}
			</span>
		</li>
	);
}

function expandLabelOf(isExpanded: boolean, hiddenCount: number, t: Translate): string {
	if (isExpanded) {
		return t('modals.invite.SHOW_LESS');
	}

	return t('modals.invite.SHOW_MORE', { count: hiddenCount });
}

export function InvitePendingList({
	invitations,
	canRevoke,
	onResend,
	onRevoke
}: Readonly<{
	invitations: PendingInvitation[];
	canRevoke: boolean;
	onResend: (invitation: PendingInvitation) => Promise<unknown>;
	onRevoke: (invitation: PendingInvitation) => Promise<unknown>;
}>) {
	const t = useTranslations();
	const [isExpanded, setIsExpanded] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [now] = useState(() => new Date());

	if (invitations.length === 0) {
		return null;
	}

	const hiddenCount = invitations.length - SHOWN_INVITATIONS;
	const canExpand = hiddenCount > 0;
	let shownInvitations = invitations.slice(0, SHOWN_INVITATIONS);
	if (isExpanded) {
		shownInvitations = invitations;
	}

	const runFor = async (
		invitation: PendingInvitation,
		action: (invitation: PendingInvitation) => Promise<unknown>
	) => {
		setBusyId(invitation.id ?? null);
		try {
			await action(invitation);
		} catch {
			// The mutation itself reports the failure
		} finally {
			setBusyId(null);
		}
	};

	return (
		<section className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">{t('modals.invite.PENDING_TITLE')}</h3>
				<kbd className={cn(commandKeycapClass, 'tabular-nums')}>{invitations.length}</kbd>
			</div>
			<div className="flex flex-col overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
				<ul className="flex max-h-72 flex-col overflow-y-auto overscroll-contain hairline-divide-y divide-border">
					{shownInvitations.map((invitation) => (
						<InvitationRow
							key={invitation.id ?? invitation.email}
							invitation={invitation}
							now={now}
							isBusy={busyId === invitation.id}
							canRevoke={canRevoke}
							onResend={(target) => runFor(target, onResend)}
							onRevoke={(target) => runFor(target, onRevoke)}
						/>
					))}
				</ul>
				{canExpand && (
					<button
						type="button"
						onClick={() => setIsExpanded((expanded) => !expanded)}
						aria-expanded={isExpanded}
						className="flex h-9 items-center gap-2 hairline-t border-border px-3 text-left text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:bg-foreground/5"
					>
						<ChevronDown
							aria-hidden="true"
							className={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')}
						/>
						{expandLabelOf(isExpanded, hiddenCount, t)}
					</button>
				)}
			</div>
		</section>
	);
}
