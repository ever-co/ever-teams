/**
 * @jest-environment jsdom
 *
 * The workspace chooser after an Ever ID sign-in: its workspace tokens last 15 minutes, so an expired one starts the
 * Ever ID sign-in again instead of failing; a workspace without a tenant yet (an account whose setup did not finish,
 * or a sign-up completed after checkout) is set up through /api/auth/ever-id/finish-setup instead of being refused.
 * For any other session the chooser works as before.
 */
import { act, renderHook } from '@testing-library/react';

const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockSignInFunction = jest.fn();
const mockFinishSetup = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('next-auth/react', () => ({ signOut: (...args: unknown[]) => mockSignOut(...args) }));
// A server action: the real module imports next-auth, which only runs on the server.
jest.mock('@/core/lib/helpers/social-logins', () => ({
	signInFunction: (...args: unknown[]) => mockSignInFunction(...args)
}));
jest.mock('@/core/services/client/api/auth/ever-id.service', () => ({
	everIdService: { finishSetup: (...args: unknown[]) => mockFinishSetup(...args) }
}));
jest.mock('@/core/lib/helpers/date-and-time', () => ({ userTimezone: () => 'Europe/Paris' }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useEverIdWorkspaceChoice } =
	require('./use-ever-id-workspace-choice') as typeof import('./use-ever-id-workspace-choice');

type ChooserData = Parameters<typeof useEverIdWorkspaceChoice>[0];

/** A workspace token shaped like Gauzy's (a JWT) that expires at `exp` (seconds). */
const tokenExpiringAt = (exp: number) =>
	[{ alg: 'none' }, { exp }].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.x';

const inAWhile = () => tokenExpiringAt(Math.floor(Date.now() / 1000) + 600);

/** Chooser data of an Ever ID sign-in: workspace 0 has its tenant, workspace 1 has none yet. */
const everIdSession: ChooserData = {
	workspaces: [],
	confirmedEmail: 'person@example.test',
	preselectIndex: -1,
	teamsUnavailable: true,
	tenantless: [1]
};

/** Lets the setup call and what follows it settle. */
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
	jest.resetAllMocks();
	mockSignOut.mockResolvedValue(undefined);
});

describe('useEverIdWorkspaceChoice', () => {
	it('leaves every choice to the usual workspace sign-in for any other session', () => {
		const signInUsually = jest.fn();
		const { result } = renderHook(() => useEverIdWorkspaceChoice(null));

		expect(result.current.continueChoice(1, tokenExpiringAt(1), signInUsually)).toBe(false);
		expect(result.current.onWorkspaceSigninError).toBeUndefined();
		expect(mockFinishSetup).not.toHaveBeenCalled();
		expect(mockSignInFunction).not.toHaveBeenCalled();
	});

	it('leaves a workspace that has its tenant to the usual workspace sign-in', () => {
		const { result } = renderHook(() => useEverIdWorkspaceChoice(everIdSession));

		expect(result.current.continueChoice(0, inAWhile(), jest.fn())).toBe(false);
		expect(mockFinishSetup).not.toHaveBeenCalled();
	});

	it('starts the Ever ID sign-in again for a workspace token past its 15 minutes', async () => {
		const { result } = renderHook(() => useEverIdWorkspaceChoice(everIdSession));

		expect(result.current.continueChoice(0, tokenExpiringAt(Math.floor(Date.now() / 1000) - 1), jest.fn())).toBe(
			true
		);
		await settle();

		expect(mockSignInFunction).toHaveBeenCalledWith({ id: 'ever-id' });
		expect(mockFinishSetup).not.toHaveBeenCalled();
	});

	it('sets up a workspace without a tenant, ends the chooser session and opens the app', async () => {
		mockFinishSetup.mockResolvedValue({ status: 200, data: { ok: true } });
		const signInUsually = jest.fn();
		const { result } = renderHook(() => useEverIdWorkspaceChoice(everIdSession));

		let handled = false;
		act(() => {
			handled = result.current.continueChoice(1, inAWhile(), signInUsually);
		});
		expect(handled).toBe(true);
		expect(result.current.setupRunning).toBe(true);
		await settle();

		expect(mockFinishSetup).toHaveBeenCalledWith(1, 'Europe/Paris');
		expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
		expect(mockPush).toHaveBeenCalledWith('/');
		expect(signInUsually).not.toHaveBeenCalled();
		// Still busy while the app opens.
		expect(result.current.setupRunning).toBe(true);
	});

	it('starts the Ever ID sign-in again when the setup answers that the session or its token expired (410)', async () => {
		mockFinishSetup.mockResolvedValue({ status: 410, data: { reason: 'expired' } });
		const { result } = renderHook(() => useEverIdWorkspaceChoice(everIdSession));

		act(() => {
			result.current.continueChoice(1, inAWhile(), jest.fn());
		});
		await settle();

		expect(mockSignInFunction).toHaveBeenCalledWith({ id: 'ever-id' });
		expect(mockPush).not.toHaveBeenCalled();
		expect(result.current.setupRunning).toBe(false);
	});

	it('continues with the usual workspace sign-in when the account has its workspace by now (409)', async () => {
		mockFinishSetup.mockResolvedValue({ status: 409, data: { reason: 'has_workspace' } });
		const signInUsually = jest.fn();
		const { result } = renderHook(() => useEverIdWorkspaceChoice(everIdSession));

		act(() => {
			result.current.continueChoice(1, inAWhile(), signInUsually);
		});
		await settle();

		expect(signInUsually).toHaveBeenCalledTimes(1);
		expect(mockSignInFunction).not.toHaveBeenCalled();
		expect(result.current.setupRunning).toBe(false);
	});

	it.each([
		['the API failed (502)', () => mockFinishSetup.mockResolvedValue({ status: 502, data: {} })],
		['too many attempts (429)', () => mockFinishSetup.mockResolvedValue({ status: 429, data: {} })],
		['the request could not be sent', () => mockFinishSetup.mockRejectedValue(new TypeError('Failed to fetch'))]
	])('stops waiting and lets the person choose again when %s', async (_label, prime) => {
		prime();
		const signInUsually = jest.fn();
		const { result } = renderHook(() => useEverIdWorkspaceChoice(everIdSession));

		act(() => {
			result.current.continueChoice(1, inAWhile(), signInUsually);
		});
		await settle();

		expect(result.current.setupRunning).toBe(false);
		expect(mockPush).not.toHaveBeenCalled();
		expect(mockSignInFunction).not.toHaveBeenCalled();
		expect(signInUsually).not.toHaveBeenCalled();
	});

	it('starts the Ever ID sign-in again when the usual workspace sign-in answers that the token expired', async () => {
		const { result } = renderHook(() => useEverIdWorkspaceChoice(everIdSession));

		result.current.onWorkspaceSigninError?.({ response: { status: 400, data: { message: 'Invalid team' } } });
		await settle();
		expect(mockSignInFunction).not.toHaveBeenCalled();

		result.current.onWorkspaceSigninError?.({
			response: { status: 400, data: { statusCode: 400, message: 'JWT token has been expired.' } }
		});
		await settle();
		expect(mockSignInFunction).toHaveBeenCalledWith({ id: 'ever-id' });
	});
});
