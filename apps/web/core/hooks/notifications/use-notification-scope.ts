'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { userState } from '@/core/stores/user/user';
import { taskDiscussionScope } from '@/core/lib/utils/task-discussion';
import { INotificationInboxScope } from '@/core/services/client/api/notifications';

/** The signed-in employee's notification scope, or null before the user and the workspace cookies are known. */
export function useNotificationScope(): INotificationInboxScope | null {
	const user = useAtomValue(userState);
	const employeeId = user?.employee?.id ?? user?.employeeId ?? null;
	const recordScope = taskDiscussionScope();
	const tenantId = recordScope?.tenantId ?? null;
	const organizationId = recordScope?.organizationId ?? null;

	return useMemo(() => {
		if (!tenantId || !organizationId) {
			return null;
		}
		if (!employeeId) {
			return null;
		}

		return { tenantId, organizationId, receiverEmployeeId: employeeId };
	}, [employeeId, organizationId, tenantId]);
}
