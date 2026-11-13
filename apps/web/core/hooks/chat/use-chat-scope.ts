'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { queryKeys } from '@/core/query/keys';
import { chatService } from '@/core/services/client/api/chat';
import { isChatEnabled } from '@/core/lib/utils/chat-enabled';
import { mergeChatPeople, type ChatPeople } from '@/core/lib/utils/chat-people';
import type { IChatPersonSummary } from '@/core/types/interfaces/common/chat';
import { userState } from '@/core/stores/user/user';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';
import { personFromTeamMember } from '@/core/components/teams/people-avatars';
import type { ChatPerson } from '@/core/lib/utils/chat-format';

/** Who is chatting, in which workspace; `null` before those are known. */
export interface ChatScope {
	tenantId: string;
	organizationId: string;
	userId: string;
	employeeId: string | null;
}

export function useChatScope(): ChatScope | null {
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

/** The list of the organization changes rarely: read once, kept for the session, refreshed in the background. */
const PEOPLE_STALE_MS = 10 * 60_000;

const NO_PEOPLE: readonly IChatPersonSummary[] = [];

/**
 * The people by employee id (and by user id), for chips, avatars and mention suggestions: the members of the active
 * team, and everyone else of the organization from the platform's own list (a conversation is not bound to a team).
 * Where chat is off, or while that list is not there, the team alone. `enabled` false reads the list only if another
 * part of the page loaded it.
 */
export function useChatPeople(enabled = true): ChatPeople {
	const team = useAtomValue(activeTeamState);
	const scope = useChatScope();
	const directory = useQuery({
		queryKey: queryKeys.chat.people(scope?.tenantId, scope?.organizationId),
		queryFn: ({ signal }) => chatService.people(signal),
		enabled: enabled && scope !== null && isChatEnabled(),
		staleTime: PEOPLE_STALE_MS,
		retry: false
	});
	const others = directory.data ?? NO_PEOPLE;

	return useMemo(() => {
		const teamPeople: ChatPerson[] = [];
		for (const member of team?.members ?? []) {
			const employeeId = String(member.employeeId ?? member.employee?.id ?? '');
			if (!employeeId) continue;
			const person = personFromTeamMember(member);
			const userId = String(member.employee?.userId ?? member.employee?.user?.id ?? person.id ?? '');
			teamPeople.push({ employeeId, userId: userId || null, name: person.name, imageUrl: person.imageUrl ?? null });
		}
		return mergeChatPeople(teamPeople, others);
	}, [others, team?.members]);
}
