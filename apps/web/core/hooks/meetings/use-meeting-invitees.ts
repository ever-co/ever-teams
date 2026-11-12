'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamState } from '@/core/stores';
import { meetingInviteesOf, type MeetingInvitee } from '@/core/lib/utils/meetings';
import { useUserQuery } from '../queries/user-user.query';

/** The members of the active team one can invite to a meeting: everyone with an address but oneself, by name. */
export function useMeetingInvitees(): MeetingInvitee[] {
	const activeTeam = useAtomValue(activeTeamState);
	const { data: user } = useUserQuery();
	const members = activeTeam?.members;
	const ownEmail = user?.email;
	return useMemo(() => meetingInviteesOf(members ?? [], ownEmail), [members, ownEmail]);
}
