'use client';

import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { activeTeamIdState, activeWorkspaceIdState, userState } from '@/core/stores';
import { chatHistoryKey, pruneExpiredChatHistory } from '@/core/components/features/chat-panel/chat-history';
import { setLiveChatScope } from '@/core/components/features/chat-panel/chat-scope';

/**
 * Runs with the shell, whether Ever SI is open or not, and without loading the chat or the AI SDK. It forgets the
 * conversations older than 30 days once per load, not only when a history is read, and it reports the scope Ever SI
 * works in, so the answer of a workspace, team or account the person left stops even with the panel closed.
 */
export function useEverSiScopeWatcher() {
	const user = useAtomValue(userState);
	const workspaceId = useAtomValue(activeWorkspaceIdState);
	const teamId = useAtomValue(activeTeamIdState);
	const userId = user?.id;

	useEffect(() => {
		pruneExpiredChatHistory();
	}, []);

	useEffect(() => {
		// No user yet is not the end of a scope (the account may still be loading); sign-out ends it
		// (clearChatHistoryForUser).
		if (!userId) {
			return;
		}
		setLiveChatScope(chatHistoryKey({ userId, workspaceId, teamId }));
	}, [userId, workspaceId, teamId]);
}
