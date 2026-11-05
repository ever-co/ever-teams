'use client';

import { useMemo } from 'react';
import type { MentionCandidate } from '@/core/components/common/rich-editor/mention-extension';
import { useMentionCandidates } from '@/core/hooks/tasks/use-mention-candidates';

/**
 * The people the editors' "@" can mention, by employee id like Gauzy's mentions: the same list as the comment
 * field, which a presence refresh of the team does not rebuild.
 */
export function useTeamMentionCandidates(): MentionCandidate[] {
	const people = useMentionCandidates();
	return useMemo(
		() => people.map((person) => ({ id: person.employeeId, name: person.name, imageUrl: person.imageUrl })),
		[people]
	);
}
