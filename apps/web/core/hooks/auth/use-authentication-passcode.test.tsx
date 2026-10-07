/**
 * @jest-environment jsdom
 *
 * Regression for WEB-012 / Q17 (2026-08-17): the passcode confirm used to call the Next.js
 * `/api/auth/login` (invite-code) route FIRST — with GAUZY_API_BASE_SERVER_URL set that hits Gauzy's
 * `/auth/login`, which wants {email,password}, so EVERY passcode login started with a guaranteed 400 —
 * and only then `signin.email/confirm`. Order is now: confirm first (workspace chooser for
 * multi-workspace users, straight in for one), invite-code route only as a fallback.
 */
import { act, renderHook } from '@testing-library/react';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockConfirm = jest.fn();
const mockInvite = jest.fn();

jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: mockReplace, push: mockPush }),
	useSearchParams: () => new URLSearchParams(''),
	usePathname: () => '/auth/passcode'
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: {
		sendAuthCode: jest.fn(),
		signInEmail: jest.fn(),
		signInEmailConfirm: (...a: unknown[]) => mockConfirm(...a),
		signInWorkspace: jest.fn(),
		signInWithEmailAndCode: (...a: unknown[]) => mockInvite(...a)
	}
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuthenticationPasscode } =
	require('./use-authentication-passcode') as typeof import('./use-authentication-passcode');

const flush = () =>
	act(async () => {
		await new Promise((r) => setTimeout(r, 0));
	});

/** Drives the hook through its public surface exactly like the passcode form does. */
async function submitCode(
	result: { current: ReturnType<typeof useAuthenticationPasscode> },
	email: string,
	code: string
) {
	act(() => result.current.setFormValues({ email, code }));
	await act(async () => {
		result.current.handleCodeSubmit({ preventDefault() {} } as unknown as React.FormEvent<HTMLFormElement>);
		await new Promise((r) => setTimeout(r, 0));
	});
}

describe('useAuthenticationPasscode → verifySignInEmailConfirmRequest (Q17 order)', () => {
	beforeEach(() => {
		mockReplace.mockReset();
		mockPush.mockReset();
		mockConfirm.mockReset();
		mockInvite.mockReset();
	});

	it('calls signin.email/confirm FIRST and shows the workspace chooser for a multi-workspace user (invite route never called)', async () => {
		mockConfirm.mockResolvedValue({
			data: { workspaces: [{ user: { id: 'u1' } }, { user: { id: 'u2' } }], defaultTeamId: 't1' }
		});
		const { result } = renderHook(() => useAuthenticationPasscode());
		await submitCode(result, 'a@b.co', '12345678');
		await flush();
		expect(mockConfirm).toHaveBeenCalledTimes(1);
		expect(mockConfirm).toHaveBeenCalledWith('a@b.co', '12345678');
		expect(mockInvite).not.toHaveBeenCalled();
		expect(result.current.authScreen.screen).toBe('workspace');
		expect(result.current.workspaces).toHaveLength(2);
		expect(result.current.defaultTeamId).toBe('t1');
		expect(mockReplace).not.toHaveBeenCalled();
	});

	it('signs a single-workspace user straight in (confirm returned user, no workspaces)', async () => {
		mockConfirm.mockResolvedValue({ data: { user: { id: 'u1' } } });
		const { result } = renderHook(() => useAuthenticationPasscode());
		await submitCode(result, 'a@b.co', '12345678');
		await flush();
		expect(mockInvite).not.toHaveBeenCalled();
		expect(mockReplace).toHaveBeenCalledWith('/');
		expect(result.current.authenticated).toBe(true);
	});

	it('falls back to the invite-code route only when confirm does not sign the user in', async () => {
		mockConfirm.mockRejectedValue({
			isAxiosError: true,
			response: { status: 400, data: { errors: { code: 'bad' } } }
		});
		mockInvite.mockResolvedValue({ data: { team: { id: 'team1' } } });
		const { result } = renderHook(() => useAuthenticationPasscode());
		await submitCode(result, 'a@b.co', 'INVITE01');
		await flush();
		expect(mockConfirm).toHaveBeenCalledTimes(1);
		expect(mockInvite).toHaveBeenCalledTimes(1);
		// order: confirm strictly before the invite route
		expect(mockConfirm.mock.invocationCallOrder[0]).toBeLessThan(mockInvite.mock.invocationCallOrder[0]);
		expect(mockReplace).toHaveBeenCalledWith('/');
	});

	it('surfaces the confirm 400 errors when both attempts fail', async () => {
		mockConfirm.mockRejectedValue({
			isAxiosError: true,
			response: { status: 400, data: { errors: { code: 'expired' } } }
		});
		mockInvite.mockRejectedValue({
			isAxiosError: true,
			response: { status: 400, data: { errors: { code: 'other' } } }
		});
		const { result } = renderHook(() => useAuthenticationPasscode());
		await submitCode(result, 'a@b.co', '00000000');
		await flush();
		expect(result.current.status).toBe('error');
		expect(result.current.errors).toEqual({ code: 'expired' });
	});
});
