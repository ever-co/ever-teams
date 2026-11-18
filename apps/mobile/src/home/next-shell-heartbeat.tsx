import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../data/query-client';
import { NEXT_SHELL_BUILD } from '../navigation/next-shell-build';
import { RunHeartbeat } from './run-heartbeat';

/**
 * In builds of the new app, its heartbeat writes the running time wherever the signed-in person is, as before the
 * switch. The current screens' five-second write stays out of those builds, so the same time is written once.
 */
export function NextShellHeartbeat() {
	if (!NEXT_SHELL_BUILD) {
		return null;
	}
	return (
		<QueryClientProvider client={queryClient}>
			<RunHeartbeat />
		</QueryClientProvider>
	);
}
