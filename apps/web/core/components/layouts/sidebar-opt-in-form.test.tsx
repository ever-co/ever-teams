/** @jest-environment jsdom */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createStore, Provider } from 'jotai';
import type { ReactNode } from 'react';

import { queryKeys } from '@/core/query/keys';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: jest.fn(), info: jest.fn() } }));
jest.mock('@/core/components/common/toast-moment', () => ({ toastMoment: jest.fn() }));
jest.mock('@/core/components/common/sidebar', () => ({
	SidebarInput: (props: Record<string, unknown>) => <input {...props} />,
	useSidebar: () => ({ state: 'expanded' })
}));
// The signed-in user, as the query cache holds it: no read of the platform here
jest.mock('@/core/hooks/queries/user-user.query', () => {
	const { useQuery } = jest.requireActual('@tanstack/react-query');
	const { queryKeys: keys } = jest.requireActual('@/core/query/keys');
	return {
		useUserQuery: () =>
			useQuery({ queryKey: keys.users.me, queryFn: () => new Promise(() => undefined), staleTime: Infinity })
	};
});

import { SidebarOptInForm } from './sidebar-opt-in-form';

/**
 * #5097: the newsletter card at the foot of the sidebar came back on every page, after a reload and on every other
 * browser or device, after the user had subscribed. It reads the subscription the platform keeps on the user.
 */
describe('The newsletter opt-in card', () => {
	const realFetch = global.fetch;
	const fetchMock = jest.fn();

	beforeEach(() => {
		global.fetch = fetchMock as unknown as typeof fetch;
		fetchMock.mockReset();
	});

	afterEach(() => {
		global.fetch = realFetch;
	});

	/** What `/api/subscribe` answers (jsdom has no `Response`). */
	const answer = (body: unknown, status: number) => ({ ok: status < 400, status, json: async () => body });

	function renderCard(user?: Record<string, unknown>) {
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		if (user) {
			queryClient.setQueryData(queryKeys.users.me, user);
		}
		// A page of its own for each test: what one subscribed is not on the next one's page
		const store = createStore();
		const wrapper = ({ children }: { children: ReactNode }) => (
			<Provider store={store}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</Provider>
		);
		render(<SidebarOptInForm />, { wrapper });
		return queryClient;
	}

	const card = () => screen.queryByText('common.SUBSCRIBE_NEWSLETTER');

	async function subscribeWith(email: string) {
		fireEvent.change(screen.getByPlaceholderText('common.EMAIL'), { target: { value: email } });
		await act(async () => {
			fireEvent.submit(screen.getByPlaceholderText('common.EMAIL').closest('form')!);
		});
	}

	it('shows nothing while the user loads, so it never flashes for someone who subscribed', () => {
		renderCard();

		expect(card()).toBeNull();
	});

	it('shows nothing to a user who subscribed', () => {
		renderCard({ id: 'user-1', uiPreferences: { newsletter: { subscribedAt: '2026-11-12T10:00:00.000Z' } } });

		expect(card()).toBeNull();
	});

	it('is offered to a user who never subscribed', () => {
		renderCard({ id: 'user-1', uiPreferences: { keyboard: { bindings: {} } } });

		expect(card()).not.toBeNull();
	});

	describe('after a subscription', () => {
		const newsletter = { subscribedAt: '2026-11-12T10:00:00.000Z', status: 'subscribed' };

		async function subscribeAs(user: Record<string, unknown>) {
			fetchMock.mockResolvedValue(answer({ error: '', status: 'subscribed', newsletter }, 201));
			const queryClient = renderCard(user);
			await subscribeWith('ada@example.com');
			return queryClient;
		}

		/** A refetch of the signed-in user (window focus, reconnect, an invalidation) answering this user. */
		const readAgain = (queryClient: QueryClient, user: Record<string, unknown>) =>
			act(async () => {
				queryClient.setQueryData(queryKeys.users.me, user);
				// React Query tells the card on the next task
				await new Promise((resolve) => setTimeout(resolve, 0));
			});

		it('goes away at once', async () => {
			await subscribeAs({ id: 'user-1', uiPreferences: { keyboard: { bindings: {} } } });

			await waitFor(() => expect(card()).toBeNull());
		});

		it('stays away when a refetch reads the user without it, as when the platform could not keep it', async () => {
			const queryClient = await subscribeAs({ id: 'user-1', uiPreferences: {} });
			await waitFor(() => expect(card()).toBeNull());

			await readAgain(queryClient, { id: 'user-1', uiPreferences: {} });

			expect(card()).toBeNull();
		});

		it('is offered to another user signed in on the same page', async () => {
			const queryClient = await subscribeAs({ id: 'user-1', uiPreferences: {} });
			await waitFor(() => expect(card()).toBeNull());

			await readAgain(queryClient, { id: 'user-2', uiPreferences: {} });

			expect(card()).not.toBeNull();
		});
	});

	it('stays, with its error, after a failed subscription', async () => {
		fetchMock.mockResolvedValue(answer({ error: 'Mailchimp refused it' }, 400));
		renderCard({ id: 'user-1' });

		await subscribeWith('ada@example.com');

		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
		expect(card()).not.toBeNull();
	});
});
