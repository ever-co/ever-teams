/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider, type PrimitiveAtom } from 'jotai';
import { CHAT_HISTORY_KEY, chatHistoryKey } from '@/core/components/features/chat-panel/chat-history';
import { onLiveChatScopeChange } from '@/core/components/features/chat-panel/chat-scope';
import { useEverSiScopeWatcher } from './use-ever-si-scope-watcher';

jest.mock('@/core/stores', () => {
	const { atom } = jest.requireActual<typeof import('jotai')>('jotai');
	return {
		userState: atom<{ id: string } | null>(null),
		activeWorkspaceIdState: atom<string | null>('workspace-a'),
		activeTeamIdState: atom<string | null>('team-a')
	};
});

const stores = jest.requireMock<{
	userState: PrimitiveAtom<{ id: string } | null>;
	activeTeamIdState: PrimitiveAtom<string | null>;
}>('@/core/stores');

const DAY = 24 * 60 * 60 * 1000;

function mountShell(store: ReturnType<typeof createStore>) {
	const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
	return renderHook(() => useEverSiScopeWatcher(), { wrapper });
}

describe('Ever SI scope watcher in the shell', () => {
	const reported = jest.fn();
	let stopListening: () => void;

	beforeEach(() => {
		localStorage.clear();
		stopListening = onLiveChatScopeChange(reported);
	});

	afterEach(() => {
		stopListening();
	});

	it('reports the live scope, and every change of team, with no Ever SI view open', () => {
		const store = createStore();
		store.set(stores.userState, { id: 'user-watch' });

		mountShell(store);
		expect(reported).toHaveBeenLastCalledWith(
			chatHistoryKey({ userId: 'user-watch', workspaceId: 'workspace-a', teamId: 'team-a' })
		);

		act(() => store.set(stores.activeTeamIdState, 'team-b'));
		expect(reported).toHaveBeenLastCalledWith(
			chatHistoryKey({ userId: 'user-watch', workspaceId: 'workspace-a', teamId: 'team-b' })
		);
	});

	it('does not end a scope while the account is still loading', () => {
		mountShell(createStore());

		expect(reported).not.toHaveBeenCalled();
	});

	it('forgets the conversations older than 30 days in every scope as the shell mounts', () => {
		const key = `${CHAT_HISTORY_KEY}:other-user:none:none`;
		const recent = { id: 'recent', title: 'Recent', updatedAt: Date.now() - DAY, messages: [] };
		const expired = { id: 'expired', title: 'Expired', updatedAt: Date.now() - 31 * DAY, messages: [] };
		localStorage.setItem(key, JSON.stringify([recent, expired]));

		mountShell(createStore());

		expect(JSON.parse(localStorage.getItem(key) ?? '[]')).toEqual([recent]);
	});
});
