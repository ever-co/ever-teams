'use client';

import { useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { activeTeamState } from '@/core/stores';
import { mentionCandidatesOf, type MentionablePerson } from '@/core/lib/utils/comment-mentions';
import type { TOrganizationTeam } from '@/core/types/schemas';

function selectMentionCandidates(activeTeam: TOrganizationTeam | null | undefined): MentionablePerson[] {
	const members = activeTeam?.members ?? [];
	return mentionCandidatesOf(members);
}

function isSameCandidate(previous: MentionablePerson, next: MentionablePerson) {
	const isSameEmployee = previous.employeeId === next.employeeId;
	const isSameName = previous.name === next.name;
	const isSameImage = previous.imageUrl === next.imageUrl;
	return isSameEmployee && isSameName && isSameImage;
}

function haveSameCandidates(previous: MentionablePerson[], next: MentionablePerson[]) {
	if (previous.length !== next.length) {
		return false;
	}
	return previous.every((candidate, index) => isSameCandidate(candidate, next[index]));
}

/** Kept apart from the team: a presence refresh rebuilds the team, not the list of people one can mention. */
const mentionCandidatesState = selectAtom(activeTeamState, selectMentionCandidates, haveSameCandidates);

/** The active team's members one can mention in a comment, with their employee ids. */
export function useMentionCandidates() {
	return useAtomValue(mentionCandidatesState);
}
