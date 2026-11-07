'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { userState } from '@/core/stores/user/user';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';

/** Whose inbox: the signed-in user in the workspace the app acts in; `null` before those are known. */
export interface InboxScope {
	tenantId: string;
	organizationId: string;
	userId: string;
	employeeId: string | null;
}

export function useInboxScope(): InboxScope | null {
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
