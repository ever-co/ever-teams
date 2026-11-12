/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';

/** The chat's membership states as useChatStates answers them: a conversation's favourite is a flag of its state. */
const mockChatStates = {
	favoriteIds: new Set<string>() as ReadonlySet<string>,
	isLoading: false,
	isError: false,
	retry: jest.fn()
};

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', employee: { id: 'employee-1' } } })
}));
// The person has no favourites filed with `/favorite`: what shows comes from the chat alone
jest.mock('./use-favorites-query', () => ({
	useFavoritesQuery: () => ({ currentEmployeeFavorites: [], isSuccess: true, isError: false, refetch: jest.fn() })
}));
jest.mock('@/core/hooks/organizations/projects/use-organization-projects-query', () => ({
	useOrganizationProjectsQuery: () => ({
		organizationProjects: [],
		isOrganizationProjectsLoaded: true,
		getOrganizationProjectsLoading: false,
		isOrganizationProjectsError: false,
		refetchOrganizationProjects: jest.fn()
	})
}));
jest.mock('@/core/hooks/chat/use-chat-conversations', () => ({
	useChatStates: () => mockChatStates,
	useChatConversations: () => ({ conversations: [], isLoading: false, isError: false, retry: jest.fn() })
}));
jest.mock('@/core/hooks/chat/use-chat-scope', () => ({
	useChatPeople: () => ({ byEmployee: new Map() }),
	useChatScope: () => null
}));
jest.mock('@/core/hooks/docs/use-docs-availability', () => ({ useDocsAvailability: () => 'unavailable' }));
jest.mock('@/core/hooks/docs/use-docs-tree', () => ({
	useDocsTree: () => ({ pages: [], isLoaded: true, isLoading: false, isError: false, retry: jest.fn() })
}));
jest.mock('@/core/lib/utils/chat-enabled', () => ({ isChatEnabled: () => true }));
jest.mock('@/core/lib/utils/docs-enabled', () => ({ isDocsEnabled: () => false }));
jest.mock('@/core/stores/teams/team-tasks', () => {
	const { atom } = jest.requireActual('jotai');
	return { tasksByTeamState: atom([]) };
});

import { useFavoriteEntries } from './use-favorite-entries';

function renderEntries() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useFavoriteEntries({ loadsProjects: true }), { wrapper });
}

describe('useFavoriteEntries and the chat', () => {
	beforeEach(() => {
		mockChatStates.favoriteIds = new Set();
		mockChatStates.isLoading = false;
		mockChatStates.isError = false;
		mockChatStates.retry.mockClear();
	});

	it("never says there are no favourites while the chat's states are on their way", () => {
		mockChatStates.isLoading = true;

		const { result } = renderEntries();

		expect(result.current.isEmpty).toBe(false);
		expect(result.current.isLoading).toBe(true);
		expect(result.current.isError).toBe(false);
	});

	it("says the chat's states could not be read, with a retry, instead of no favourites", () => {
		mockChatStates.isError = true;

		const { result } = renderEntries();

		expect(result.current.isEmpty).toBe(false);
		expect(result.current.isError).toBe(true);
		act(() => result.current.retry());
		expect(mockChatStates.retry).toHaveBeenCalledTimes(1);
	});

	it('says there are none once the chat answered without a starred conversation', () => {
		const { result } = renderEntries();

		expect(result.current.isEmpty).toBe(true);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.isError).toBe(false);
	});
});
