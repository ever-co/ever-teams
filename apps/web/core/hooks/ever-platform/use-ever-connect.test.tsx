/**
 * @jest-environment jsdom
 */
/**
 * The section gate: the paired API's `health` is asked only when NEXT_PUBLIC_EVER_CONNECT_ENABLED is
 * exactly 'true' AND someone is signed in, with that person's own token; 401 and 404 both mean
 * "not available".
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockHealth = jest.fn();
let mockUser: { id: string; tenantId: string; employee?: { organizationId: string } } | undefined;
let mockToken: string | null;

jest.mock('@/core/services/client/api/ever-platform/ever-connect.service', () => ({
	everConnectService: { health: (...args: unknown[]) => mockHealth(...args) }
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => mockToken
}));

import { useEverConnectAvailable } from './use-ever-connect';

const ORIGINAL_ENV = process.env;

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	delete process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED;
	mockUser = { id: 'user-1', tenantId: 'tenant-1', employee: { organizationId: 'org-1' } };
	mockToken = 'person-token';
	mockHealth.mockReset();
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('useEverConnectAvailable', () => {
	it('asks nothing while the flag is unset', async () => {
		const { result } = renderHook(() => useEverConnectAvailable(), { wrapper });
		await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
		expect(result.current.available).toBe(false);
		expect(mockHealth).not.toHaveBeenCalled();
	});

	it('asks nothing without a signed-in person, even with the flag on', async () => {
		process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = 'true';
		mockUser = undefined;
		mockToken = null;
		const { result } = renderHook(() => useEverConnectAvailable(), { wrapper });
		await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
		expect(result.current.available).toBe(false);
		expect(mockHealth).not.toHaveBeenCalled();
	});

	it('asks nothing when the caller is not active (not a manager, a demo deployment)', async () => {
		process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = 'true';
		const { result } = renderHook(() => useEverConnectAvailable(false), { wrapper });
		await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
		expect(result.current.available).toBe(false);
		expect(mockHealth).not.toHaveBeenCalled();
	});

	it('is available once health answers, with the person own token', async () => {
		process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = 'true';
		mockHealth.mockResolvedValue({ connected: false });
		const { result } = renderHook(() => useEverConnectAvailable(), { wrapper });
		await waitFor(() => expect(result.current.available).toBe(true));
		expect(result.current.connected).toBe(false);
		expect(mockHealth).toHaveBeenCalledTimes(1);
		expect(mockHealth.mock.calls[0][0].scope).toMatchObject({ accessToken: 'person-token', tenantId: 'tenant-1' });
	});

	it('is not available when health answers 401 or 404 (the service answers null)', async () => {
		process.env.NEXT_PUBLIC_EVER_CONNECT_ENABLED = 'true';
		mockHealth.mockResolvedValue(null);
		const { result } = renderHook(() => useEverConnectAvailable(), { wrapper });
		await waitFor(() => expect(mockHealth).toHaveBeenCalled());
		await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
		expect(result.current.available).toBe(false);
	});
});
