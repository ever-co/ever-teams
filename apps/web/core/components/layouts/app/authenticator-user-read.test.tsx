/** @jest-environment jsdom */
/**
 * #5694: a page opened while the signed-in user cannot be read (the API restarts, a gateway answers 503) says so with
 * Try again instead of its loading shapes, keeps asking less and less often, and loads once the API answers, without
 * a reload. A read that is only slow keeps the page's skeleton. Like the real ones, the page frame and the skeleton
 * read the user too (the header does), so a frame mounted again on every attempt would ask the API in a loop.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { ApiErrorService } from '@/core/services/client/api-error.service';
import { withAuthentication } from './authenticator';

const mockGetUser = jest.fn();

jest.mock('@/core/services/client/api/users/user.service', () => ({
	userService: { getAuthenticatedUserData: () => mockGetUser() }
}));
jest.mock('@/core/lib/helpers/cookies', () => ({ getAccessTokenCookie: () => 'access-token' }));
jest.mock('@/core/lib/auth/jwt-utils', () => ({ decodeJWT: () => ({ id: 'user-1' }) }));
jest.mock('jotai', () => ({
	useAtom: () => [null, jest.fn()],
	useStore: () => ({ get: () => null })
}));
jest.mock('@/core/stores', () => ({ userState: {}, isTeamMemberState: {} }));
jest.mock('@/core/lib/helpers/index', () => ({
	getNoTeamPopupShowCookie: () => false,
	setNoTeamPopupShowCookie: jest.fn()
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children }: { children: ReactNode }) => (
		<div>
			<MockHeaderUserReader />
			{children}
		</div>
	)
}));
jest.mock('../../common/global-skeleton', () => () => null);
jest.mock('../../common/skeleton/modal-skeleton', () => ({ ModalSkeleton: () => null }));
jest.mock('../../optimized-components', () => ({
	LazyCreateTeamModal: () => null,
	LazyJoinTeamModal: () => null
}));

function MockHeaderUserReader() {
	useUserQuery();
	return null;
}

const USER = { id: 'user-1', email: 'olu.adeyemi@example.com' };
const API_UNAVAILABLE = new ApiErrorService('Session check unavailable, retry later', 503);

const ProtectedPage = () => <main data-testid="protected-page">Task #16</main>;
const PageSkeleton = () => (
	<div data-testid="page-skeleton">
		<MockHeaderUserReader />
	</div>
);
const AuthenticatedPage = withAuthentication(ProtectedPage, { displayName: 'TaskDetails', skeleton: PageSkeleton });

function renderPage() {
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	render(
		<QueryClientProvider client={queryClient}>
			<AuthenticatedPage />
		</QueryClientProvider>
	);
}

/** Lets the read settle and React render what it answered. */
async function settle(ms = 0) {
	await act(async () => {
		await jest.advanceTimersByTimeAsync(ms);
	});
}

describe('withAuthentication when the user read fails', () => {
	beforeEach(() => {
		jest.useFakeTimers();
		mockGetUser.mockReset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it('keeps the page skeleton while the user read is on its way', async () => {
		mockGetUser.mockReturnValue(new Promise(() => undefined));

		renderPage();
		await settle(30_000);

		expect(screen.getByTestId('page-skeleton')).toBeTruthy();
		expect(screen.queryByText('pages.unauthorized.TRY_AGAIN')).toBeNull();
		expect(mockGetUser).toHaveBeenCalledTimes(1);
	});

	it('says the page could not be loaded, with Try again, instead of its loading shapes', async () => {
		mockGetUser.mockRejectedValue(API_UNAVAILABLE);

		renderPage();
		await settle();

		expect(screen.queryByTestId('page-skeleton')).toBeNull();
		expect(screen.getAllByText('pages.error.PAGE_NOT_LOADED').length).toBeGreaterThan(0);
		expect(screen.getByText('toasts.REASONS.SERVER')).toBeTruthy();
		expect(screen.getByText('pages.unauthorized.TRY_AGAIN')).toBeTruthy();
	});

	it('loads the page when Try again reads the user', async () => {
		mockGetUser.mockRejectedValueOnce(API_UNAVAILABLE).mockResolvedValue(USER);

		renderPage();
		await settle();
		fireEvent.click(screen.getByText('pages.unauthorized.TRY_AGAIN'));
		await settle();

		expect(screen.getByTestId('protected-page')).toBeTruthy();
		expect(mockGetUser).toHaveBeenCalledTimes(2);
	});

	it('keeps saying so, never the skeleton, while Try again reads the user', async () => {
		mockGetUser.mockRejectedValueOnce(API_UNAVAILABLE).mockReturnValue(new Promise(() => undefined));

		renderPage();
		await settle();
		fireEvent.click(screen.getByText('pages.unauthorized.TRY_AGAIN'));
		await settle(1_000);

		expect(mockGetUser).toHaveBeenCalledTimes(2);
		expect(screen.queryByTestId('page-skeleton')).toBeNull();
		expect(screen.getByText('toasts.REASONS.SERVER')).toBeTruthy();
	});

	it('does not ask the API again before its next attempt, whatever the page frame mounts', async () => {
		mockGetUser.mockRejectedValue(API_UNAVAILABLE);

		renderPage();
		await settle();
		await settle(4_900);

		expect(mockGetUser).toHaveBeenCalledTimes(1);
	});

	it('loads the page by itself once the API answers again, without a reload', async () => {
		mockGetUser.mockRejectedValueOnce(API_UNAVAILABLE).mockResolvedValue(USER);

		renderPage();
		await settle();
		await settle(4_900);
		expect(mockGetUser).toHaveBeenCalledTimes(1);
		await settle(100);

		expect(await screen.findByTestId('protected-page')).toBeTruthy();
		expect(mockGetUser).toHaveBeenCalledTimes(2);
	});

	it('keeps saying so while the API stays down', async () => {
		mockGetUser.mockRejectedValue(API_UNAVAILABLE);

		renderPage();
		await settle();
		await settle(2 * 60_000);

		expect(mockGetUser.mock.calls.length).toBeGreaterThan(1);
		expect(screen.getByText('pages.unauthorized.TRY_AGAIN')).toBeTruthy();
		expect(screen.queryByTestId('page-skeleton')).toBeNull();
	});
});
