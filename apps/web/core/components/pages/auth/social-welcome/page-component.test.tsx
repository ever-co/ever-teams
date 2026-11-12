/** @jest-environment jsdom */
/**
 * A social sign-up that opens its session ends as every sign-in does (navigateAfterSignIn): on the page set for the
 * sign-in, on the Board that started it (#5020), else in the app. One that opened no session goes to the app, and one
 * whose account waits for its e-mail confirmation stays on its notice.
 */
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

const mockSession = { current: { data: null as unknown, status: 'authenticated' } };
const mockReplace = jest.fn();
const mockNavigateAfterSignIn = jest.fn();
const mockSetAuthCookies = jest.fn();

jest.mock('next-auth/react', () => ({
	useSession: () => ({ ...mockSession.current, update: jest.fn() })
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/lib/helpers/index', () => ({
	setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args)
}));
jest.mock('@/core/lib/auth/navigate-after-sign-in', () => ({
	navigateAfterSignIn: (...args: unknown[]) => mockNavigateAfterSignIn(...args)
}));
jest.mock('@/core/components/layouts/default-layout/auth-layout', () => ({
	AuthLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>
}));
jest.mock('@/core/components/auth/kit/auth-state', () => ({
	AuthState: ({ title }: { title: string }) => <p>{title}</p>,
	AuthAddress: () => null
}));
jest.mock('@/core/components/auth/scenes/auth-scenes', () => ({ InboxScene: () => null }));

import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import Welcome from './page-component';

describe('the social sign-up welcome', () => {
	beforeEach(() => {
		mockReplace.mockReset();
		mockNavigateAfterSignIn.mockReset();
		mockSetAuthCookies.mockReset();
	});

	it('opens the session, then ends as every sign-in does: the page set for it, the Board that started it, or the app', () => {
		mockSession.current = {
			status: 'authenticated',
			data: {
				user: {
					access_token: 'access-token',
					refresh_token: 'refresh-token',
					tenantId: 'tenant-1',
					organizationId: 'organization-1',
					teamId: 'team-1',
					userId: 'user-1'
				}
			}
		};

		render(<Welcome />);

		expect(mockSetAuthCookies).toHaveBeenCalledWith(expect.objectContaining({ access_token: 'access-token' }));
		expect(mockNavigateAfterSignIn).toHaveBeenCalledWith({ replace: true });
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('ends the sign-up once, though the session comes again before the page leaves', () => {
		mockSession.current = {
			status: 'authenticated',
			data: { user: { access_token: 'access-token', refresh_token: 'refresh-token', tenantId: 'tenant-1' } }
		};

		const { rerender } = render(<Welcome />);
		// A refetched session: a new object, and a new `update`, so the effect runs again
		mockSession.current = { ...mockSession.current, data: { ...(mockSession.current.data as object) } };
		rerender(<Welcome />);

		expect(mockNavigateAfterSignIn).toHaveBeenCalledTimes(1);
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('goes to the app when no session was opened', () => {
		mockSession.current = { status: 'unauthenticated', data: null };

		render(<Welcome />);

		expect(mockReplace).toHaveBeenCalledWith(DEFAULT_APP_PATH);
		expect(mockNavigateAfterSignIn).not.toHaveBeenCalled();
	});

	it('stays on its notice while the account waits for its e-mail confirmation', () => {
		mockSession.current = {
			status: 'authenticated',
			data: { authCookie: { verifyEmail: true, email: 'ada@example.com' } }
		};

		render(<Welcome />);

		expect(mockNavigateAfterSignIn).not.toHaveBeenCalled();
		expect(mockReplace).not.toHaveBeenCalled();
	});
});
