/**
 * @jest-environment jsdom
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { EBaseEntityEnum } from '@/core/types/generics/enums/entity';

interface StoredFavorite {
	id: string;
	entity: string;
	entityId: string;
	employeeId?: string;
}

/** The platform's favourites of the employee, as the mocked service files and lists them. */
let stored: StoredFavorite[] = [];
let filed = 0;

const mockFavoriteService = {
	getFavoritesByEmployee: jest.fn(async () => ({ items: [...stored], total: stored.length })),
	createFavorite: jest.fn(async (body: Omit<StoredFavorite, 'id'>) => {
		filed += 1;
		const created = { id: `favorite-${filed}`, ...body };
		stored = [...stored, created];
		return created;
	}),
	deleteFavorite: jest.fn(async (id: string) => {
		stored = stored.filter((favorite) => favorite.id !== id);
		return { affected: 1 };
	})
};

// Getters: the mocked modules load before this file's constants are set, and read the service only when called
jest.mock('@/core/services/client/api', () => ({
	get favoriteService() {
		return mockFavoriteService;
	}
}));
jest.mock('@/core/services/client/api/favorites/favorite.service', () => ({
	get favoriteService() {
		return mockFavoriteService;
	}
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: { id: 'user-1', employee: { id: 'employee-1' } } })
}));

import { useFavoriteToggle } from './use-favorite-toggle';

const PROJECT = EBaseEntityEnum.OrganizationProject;

function renderToggle() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => useFavoriteToggle(PROJECT), { wrapper });
}

/** Two controls of one item, as a project's header star and its sidebar menu: two hooks over one cache. */
function renderTwoControls() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	return renderHook(() => ({ header: useFavoriteToggle(PROJECT), sidebar: useFavoriteToggle(PROJECT) }), {
		wrapper
	});
}

describe('useFavoriteToggle', () => {
	beforeEach(() => {
		stored = [{ id: 'favorite-0', entity: PROJECT, entityId: 'project-1', employeeId: 'employee-1' }];
		filed = 0;
		jest.clearAllMocks();
	});

	it('shows a new favourite at once, then removes it with the id the platform gave it', async () => {
		const { result } = renderToggle();
		await waitFor(() => expect(result.current.isFavorite('project-1')).toBe(true));

		let added: Promise<boolean> = Promise.resolve(false);
		act(() => {
			added = result.current.toggleFavorite('project-2');
		});
		await waitFor(() => expect(result.current.isFavorite('project-2')).toBe(true));
		await act(async () => {
			await expect(added).resolves.toBe(true);
		});
		expect(mockFavoriteService.createFavorite).toHaveBeenCalledWith({
			entity: PROJECT,
			entityId: 'project-2',
			employeeId: 'employee-1'
		});

		await act(async () => {
			await expect(result.current.toggleFavorite('project-2')).resolves.toBe(false);
		});
		expect(mockFavoriteService.deleteFavorite).toHaveBeenCalledWith('favorite-1');
		await waitFor(() => expect(result.current.isFavorite('project-2')).toBe(false));
	});

	it('puts the favourites back when the platform refuses, and says so to the caller', async () => {
		const { result } = renderToggle();
		await waitFor(() => expect(result.current.isFavorite('project-1')).toBe(true));
		mockFavoriteService.deleteFavorite.mockRejectedValueOnce(new Error('refused'));

		await act(async () => {
			await expect(result.current.toggleFavorite('project-1')).rejects.toThrow('refused');
		});

		expect(result.current.isFavorite('project-1')).toBe(true);
		expect(result.current.isPending('project-1')).toBe(false);
	});

	it('lets no other control of the item act while its favourite is being changed', async () => {
		const { result } = renderTwoControls();
		await waitFor(() => expect(result.current.header.isFavorite('project-1')).toBe(true));
		let release: () => void = () => undefined;
		mockFavoriteService.createFavorite.mockImplementationOnce(
			(body: Omit<StoredFavorite, 'id'>) =>
				new Promise((resolve) => {
					release = () => resolve({ id: 'favorite-7', ...body });
				})
		);

		let adding: Promise<boolean> = Promise.resolve(false);
		act(() => {
			adding = result.current.header.toggleFavorite('project-4');
		});
		await waitFor(() => expect(result.current.sidebar.isPending('project-4')).toBe(true));
		// The sidebar sees the placeholder as a favourite: its click must not send the placeholder's id
		expect(result.current.sidebar.isFavorite('project-4')).toBe(true);
		await act(async () => {
			await result.current.sidebar.toggleFavorite('project-4');
		});
		expect(mockFavoriteService.deleteFavorite).not.toHaveBeenCalled();

		await act(async () => {
			release();
			await adding;
		});
		expect(result.current.sidebar.isPending('project-4')).toBe(false);
		expect(mockFavoriteService.createFavorite).toHaveBeenCalledTimes(1);
	});

	it('reads the whole list before a click decides, so a favourite clicked early is removed, not filed twice', async () => {
		const { result } = renderToggle();

		await act(async () => {
			await expect(result.current.toggleFavorite('project-1')).resolves.toBe(false);
		});

		expect(mockFavoriteService.createFavorite).not.toHaveBeenCalled();
		expect(mockFavoriteService.deleteFavorite).toHaveBeenCalledWith('favorite-0');
	});

	it('sends one request at a time for an item', async () => {
		const { result } = renderToggle();
		await waitFor(() => expect(result.current.isFavorite('project-1')).toBe(true));
		let release: () => void = () => undefined;
		mockFavoriteService.createFavorite.mockImplementationOnce(
			(body: Omit<StoredFavorite, 'id'>) =>
				new Promise((resolve) => {
					release = () => resolve({ id: 'favorite-9', ...body });
				})
		);

		let first: Promise<boolean> = Promise.resolve(false);
		act(() => {
			first = result.current.toggleFavorite('project-3');
		});
		await waitFor(() => expect(result.current.isPending('project-3')).toBe(true));
		await act(async () => {
			await result.current.toggleFavorite('project-3');
		});
		expect(mockFavoriteService.createFavorite).toHaveBeenCalledTimes(1);

		await act(async () => {
			release();
			await first;
		});
		expect(result.current.isPending('project-3')).toBe(false);
	});
});
