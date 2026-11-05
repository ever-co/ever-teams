import { EInviteStatus } from '@/core/types/generics/enums/invite';

export interface PendingInvitation {
	id?: string | null;
	email?: string | null;
	fullName?: string | null;
	status?: string | null;
	expireDate?: Date | string | null;
	createdAt?: Date | string | null;
}

export type InvitationState = 'pending' | 'expired' | 'declined';

export function invitationDateOf(value: Date | string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date;
}

export function invitationStateOf(invitation: PendingInvitation, now: Date): InvitationState {
	if (invitation.status === EInviteStatus.REJECTED) {
		return 'declined';
	}
	if (invitation.status === EInviteStatus.EXPIRED) {
		return 'expired';
	}
	const expiry = invitationDateOf(invitation.expireDate);
	if (expiry && expiry < now) {
		return 'expired';
	}

	return 'pending';
}

export function isOpenInvitation(invitation: PendingInvitation): boolean {
	return invitation.status !== EInviteStatus.ACCEPTED;
}
