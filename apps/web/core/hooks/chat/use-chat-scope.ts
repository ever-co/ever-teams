'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
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

/** The people of the active team by employee id (and by user id), for chips, avatars and mention suggestions. */
export function useChatPeople(): { byEmployee: Map<string, ChatPerson>; byUser: Map<string, ChatPerson>; list: ChatPerson[] } {
	const team = useAtomValue(activeTeamState);
	return useMemo(() => {
		const byEmployee = new Map<string, ChatPerson>();
		const byUser = new Map<string, ChatPerson>();
		for (const member of team?.members ?? []) {
			const employeeId = String(member.employeeId ?? member.employee?.id ?? '');
			if (!employeeId) continue;
			const person = personFromTeamMember(member);
			const userId = String(member.employee?.userId ?? member.employee?.user?.id ?? person.id ?? '');
			const entry: ChatPerson = { employeeId, userId: userId || null, name: person.name, imageUrl: person.imageUrl ?? null };
			byEmployee.set(employeeId, entry);
			if (userId) byUser.set(userId, entry);
		}
		return { byEmployee, byUser, list: [...byEmployee.values()] };
	}, [team?.members]);
}
