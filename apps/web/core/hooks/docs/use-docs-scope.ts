'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { userState } from '@/core/stores/user/user';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';
import { personFromTeamMember } from '@/core/components/teams/people-avatars';
import type { MentionCandidate } from '@/core/components/common/rich-editor/mention-extension';

/** Who is writing, in which workspace; `null` before those are known. */
export interface DocsScope {
	tenantId: string;
	organizationId: string;
	userId: string;
	employeeId: string | null;
}

export function useDocsScope(): DocsScope | null {
	const user = useAtomValue(userState);
	const userId = user?.id ?? null;
	const employeeId = user?.employee?.id ?? user?.employeeId ?? null;
	const recordScope = taskDiscussionScope();
	const tenantId = recordScope?.tenantId ?? null;
	const organizationId = recordScope?.organizationId ?? null;

	return useMemo(() => {
		if (!tenantId || !organizationId || !userId) return null;
		return { tenantId, organizationId, userId, employeeId };
	}, [employeeId, organizationId, tenantId, userId]);
}

/** The people of the active team as the editor's `@` suggestions (by employee id, which the platform notifies). */
export function useDocsMentionCandidates(): MentionCandidate[] {
	const team = useAtomValue(activeTeamState);
	return useMemo(() => {
		const candidates: MentionCandidate[] = [];
		const seen = new Set<string>();
		for (const member of team?.members ?? []) {
			const employeeId = String(member.employeeId ?? member.employee?.id ?? '');
			if (!employeeId || seen.has(employeeId)) continue;
			seen.add(employeeId);
			const person = personFromTeamMember(member);
			candidates.push({ id: employeeId, name: person.name, imageUrl: person.imageUrl ?? null });
		}
		return candidates;
	}, [team?.members]);
}
