'use client';

import { useEffect, useMemo, useState } from 'react';
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

/**
 * The workspace is read from the cookies at every render; a switch in another tab changes them without rendering
 * this one, so the tab renders again when it comes back into view (and at once where the browser reports cookie
 * changes).
 */
function useRenderOnWorkspaceChange(): void {
	const [, setTick] = useState(0);
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const bump = () => setTick((value) => value + 1);
		const onVisible = () => {
			if (document.visibilityState === 'visible') bump();
		};
		const cookies = (window as unknown as { cookieStore?: EventTarget }).cookieStore;
		window.addEventListener('focus', bump);
		document.addEventListener('visibilitychange', onVisible);
		cookies?.addEventListener?.('change', bump);
		return () => {
			window.removeEventListener('focus', bump);
			document.removeEventListener('visibilitychange', onVisible);
			cookies?.removeEventListener?.('change', bump);
		};
	}, []);
}

export function useInboxScope(): InboxScope | null {
	useRenderOnWorkspaceChange();
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
