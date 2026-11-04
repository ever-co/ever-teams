'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { ERoleName } from '@/core/types/generics/enums/role';
import { EInviteStatus } from '@/core/types/generics/enums/invite';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import { useTeamInvitationsQuery } from '@/core/hooks/invitations/use-team-invitations-query';
import { useSendTeamInvitation } from '@/core/hooks/invitations/use-send-team-invitation';
import {
	classifyInviteEmail,
	extractEmails,
	InviteEmailEntry,
	mergeEmails,
	sendableEntries
} from '@/core/lib/utils/invite-emails';
import { MAX_EMAILS_PER_INVITE } from '@/core/lib/validation/invite';

const INVITABLE_ROLE_NAMES = new Set<string>([ERoleName.ADMIN, ERoleName.EMPLOYEE, ERoleName.MANAGER]);
const ADMIN_ROLE_NAMES = new Set<string>([ERoleName.ADMIN, ERoleName.SUPER_ADMIN]);

export interface InviteSendResult {
	invited: number;
	resent: number;
}

function emailOf(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	return value.trim().toLowerCase();
}

/**
 * The invite dialog's state: the addresses typed or pasted (each classified as new, already invited, already a
 * member or invalid), the role an admin picks for the batch, and the send, which invites the new addresses in one
 * request and sends the pending invitations again.
 */
export function useInviteDialog(open: boolean) {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const { roles, isLoading: rolesLoading, isSuccess: rolesSuccess } = useRolesQuery({ enabled: open });
	const { teamInvitations, fetchingInvitations } = useTeamInvitationsQuery({ enabled: open });
	const { inviteUsers, inviteLoading, resendTeamInvitation, resendInviteLoading } = useSendTeamInvitation();

	const [emails, setEmails] = useState<string[]>([]);
	const [isSending, setIsSending] = useState(false);

	const isAdmin = ADMIN_ROLE_NAMES.has(user?.role?.name ?? '');
	const selectableRoles = useMemo(() => roles.filter((role) => INVITABLE_ROLE_NAMES.has(role.name)), [roles]);
	const defaultSelectedRole = useMemo(
		() => selectableRoles.find((role) => role.name === ERoleName.EMPLOYEE) ?? selectableRoles[0],
		[selectableRoles]
	);
	const [selectedRoleId, setSelectedRoleId] = useState(() => defaultSelectedRole?.id);

	// Roles arrive after the dialog opens and change with the organization: an explicit choice survives a refresh,
	// a choice the new list no longer holds falls back to the employee role.
	useEffect(() => {
		setSelectedRoleId((currentRoleId) => {
			const isStillOffered = selectableRoles.some((role) => role.id === currentRoleId);
			if (currentRoleId && isStillOffered) {
				return currentRoleId;
			}

			return defaultSelectedRole?.id;
		});
	}, [defaultSelectedRole?.id, selectableRoles]);

	const memberEmails = useMemo(() => {
		const addresses = new Set<string>();
		for (const member of activeTeam?.members ?? []) {
			const address = emailOf(member.employee?.user?.email);
			if (address) {
				addresses.add(address);
			}
		}

		return addresses;
	}, [activeTeam?.members]);

	const invitationIdsByEmail = useMemo(() => {
		const ids = new Map<string, string>();
		for (const invitation of teamInvitations) {
			const address = emailOf(invitation.email);
			const invitationId = invitation.id;
			if (!address || !invitationId) {
				continue;
			}
			const isAccepted = invitation.status === EInviteStatus.ACCEPTED;
			if (!isAccepted) {
				ids.set(address, invitationId);
			}
		}

		return ids;
	}, [teamInvitations]);

	const entries: InviteEmailEntry[] = useMemo(() => {
		const context = { memberEmails, pendingInvitations: invitationIdsByEmail };

		return emails.map((email) => classifyInviteEmail(email, context));
	}, [emails, invitationIdsByEmail, memberEmails]);

	const sendable = useMemo(() => sendableEntries(entries), [entries]);

	const rolesPending = rolesLoading || !rolesSuccess;
	const roleNotChosenYet = selectableRoles.length > 0 && !selectedRoleId;
	const roleNotReady = rolesPending || roleNotChosenYet;
	const adminWaitsForRoles = isAdmin && roleNotReady;
	const prerequisitesPending = Boolean(fetchingInvitations) || adminWaitsForRoles;
	const isBusy = isSending || inviteLoading || resendInviteLoading;
	const isFull = emails.length >= MAX_EMAILS_PER_INVITE;

	const addFromText = useCallback((text: string) => {
		const found = extractEmails(text);
		if (found.length === 0) {
			return;
		}
		setEmails((current) => mergeEmails(current, found).slice(0, MAX_EMAILS_PER_INVITE));
	}, []);

	const removeEmail = useCallback((email: string) => {
		setEmails((current) => current.filter((address) => address !== email));
	}, []);

	const removeLastEmail = useCallback(() => {
		setEmails((current) => current.slice(0, -1));
	}, []);

	const reset = useCallback(() => {
		setEmails([]);
	}, []);

	/** Resolves to what was sent, or null when nothing could leave yet. Rejects with Gauzy's error. */
	const send = useCallback(async (): Promise<InviteSendResult | null> => {
		if (prerequisitesPending) {
			return null;
		}
		const newEmails: string[] = [];
		const pendingIds: string[] = [];
		for (const entry of sendable) {
			if (entry.state === 'new') {
				newEmails.push(entry.email);
			}
			if (entry.invitationId) {
				pendingIds.push(entry.invitationId);
			}
		}
		const hasNothingToSend = newEmails.length === 0 && pendingIds.length === 0;
		if (hasNothingToSend) {
			return null;
		}

		setIsSending(true);
		try {
			if (newEmails.length > 0) {
				await inviteUsers(newEmails, selectedRoleId);
			}
			for (const invitationId of pendingIds) {
				await resendTeamInvitation(invitationId);
			}
			setEmails([]);

			return { invited: newEmails.length, resent: pendingIds.length };
		} finally {
			setIsSending(false);
		}
	}, [inviteUsers, prerequisitesPending, resendTeamInvitation, selectedRoleId, sendable]);

	return {
		isAdmin,
		selectableRoles,
		selectedRoleId,
		setSelectedRoleId,
		teamInvitations,
		entries,
		sendableCount: sendable.length,
		isFull,
		addFromText,
		removeEmail,
		removeLastEmail,
		reset,
		send,
		isBusy,
		prerequisitesPending
	};
}
