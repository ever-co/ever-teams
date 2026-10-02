/**
 * @jest-environment jsdom
 *
 * The passcode page in Ever ID mode (`/auth/passcode?ever_id=confirm`): the Gauzy API found an existing account
 * with the Ever ID's verified address and sent its own one-time code there. The code goes to
 * /api/auth/ever-id/confirm, whose one-time key is in a cookie this page cannot read (never an e-mail address,
 * which this page does not know), and on success the usual workspace chooser follows. The passcode hook's other
 * paths are covered by use-authentication-passcode.test.tsx.
 */
import { act, renderHook } from '@testing-library/react';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockConfirmLink = jest.fn();
const mockEmailConfirm = jest.fn();
let mockQuery = 'ever_id=confirm';

jest.mock('next/navigation', () => ({
	useRouter: () => ({ replace: mockReplace, push: mockPush }),
	useSearchParams: () => new URLSearchParams(mockQuery),
	usePathname: () => '/auth/passcode'
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: {
		sendAuthCode: jest.fn(),
		signInEmail: jest.fn(),
		signInEmailConfirm: (...args: unknown[]) => mockEmailConfirm(...args),
		signInWorkspace: jest.fn(),
		signInWithEmailAndCode: jest.fn()
	}
}));
jest.mock('@/core/services/client/api/auth/ever-id.service', () => ({
	everIdService: { confirmLink: (...args: unknown[]) => mockConfirmLink(...args) }
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuthenticationPasscode } =
	require('./use-authentication-passcode') as typeof import('./use-authentication-passcode');

const workspace = (id: string, tenantId: string, name: string) => ({
	token: `workspace-token-${id}`,
	user: {
		id,
		email: 'person@example.test',
		name: 'Test Person',
		imageUrl: null,
		lastTeamId: null,
		lastLoginAt: '2026-09-01T10:00:00.000Z',
		tenant: { id: tenantId, name, logo: '' }
	}
});

const confirmed = {
	status: 200,
	data: {
		workspaces: [workspace('u1', 't1', 'Acme'), workspace('u2', 't2', 'Beta')],
		confirmed_email: 'person@example.test',
		show_popup: true,
		total_workspaces: 2
	}
};

async function submitCode(result: { current: ReturnType<typeof useAuthenticationPasscode> }, code: string) {
	act(() => result.current.setFormValues((values) => ({ ...values, code })));
	await act(async () => {
		result.current.handleCodeSubmit({ preventDefault() {} } as unknown as React.FormEvent<HTMLFormElement>);
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

beforeEach(() => {
	mockQuery = 'ever_id=confirm';
	window.history.replaceState(null, '', '/auth/passcode?ever_id=confirm');
	jest.resetAllMocks();
});

describe('useAuthenticationPasscode in Ever ID mode', () => {
	it('starts on the code screen, without an e-mail address', () => {
		const { result } = renderHook(() => useAuthenticationPasscode());

		expect(result.current.everIdConfirm).toBe(true);
		expect(result.current.authScreen.screen).toBe('passcode');
		expect(result.current.formValues.email).toBe('');
	});

	it('sends the code to the Ever ID route and continues with the workspace chooser', async () => {
		mockConfirmLink.mockResolvedValue(confirmed);
		const { result } = renderHook(() => useAuthenticationPasscode());

		await submitCode(result, 'ABCD1234');

		expect(mockConfirmLink).toHaveBeenCalledWith('ABCD1234');
		expect(mockEmailConfirm).not.toHaveBeenCalled();
		expect(result.current.authScreen.screen).toBe('workspace');
		expect(result.current.workspaces.map((entry) => entry.token)).toEqual([
			'workspace-token-u1',
			'workspace-token-u2'
		]);
		expect(result.current.everIdTeamsUnavailable).toBe(true);
		// The workspace sign-in that follows needs the address: it comes from the answer, not from the URL.
		expect(result.current.formValues.email).toBe('person@example.test');
		// The chooser stays on this page: nothing navigates away.
		expect(mockReplace).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('ends the Ever ID step once the code is accepted: no marker in the URL, no code kept, e-mail codes again', async () => {
		mockConfirmLink.mockResolvedValue(confirmed);
		const { result } = renderHook(() => useAuthenticationPasscode());

		await submitCode(result, 'ABCD1234');

		expect(window.location.search).toBe('');
		expect(result.current.everIdConfirm).toBe(false);
		expect(result.current.formValues.code).toBe('');

		// Back on the e-mail screen, a new code is an e-mail sign-in, not another Ever ID confirmation.
		mockEmailConfirm.mockResolvedValue({ data: { workspaces: [workspace('u1', 't1', 'Acme')] } });
		await submitCode(result, '98765432');
		expect(mockConfirmLink).toHaveBeenCalledTimes(1);
		expect(mockEmailConfirm).toHaveBeenCalledWith('person@example.test', '98765432');
	});

	it('leaves the step when the person goes back: the marker leaves the URL and the code is emptied', () => {
		const { result } = renderHook(() => useAuthenticationPasscode());
		act(() => result.current.setFormValues((values) => ({ ...values, code: 'ABCD1234' })));

		act(() => result.current.leaveEverIdStep());

		expect(window.location.search).toBe('');
		expect(result.current.everIdConfirm).toBe(false);
		expect(result.current.formValues.code).toBe('');
	});

	it.each([
		[400, 'pages.auth.INVALID_CODE_TRY_AGAIN'],
		[410, 'pages.auth.everId.CODE_EXPIRED'],
		[429, 'pages.auth.everId.TOO_MANY_ATTEMPTS'],
		[502, 'pages.auth.everId.UNAVAILABLE']
	])('shows an error for an answer %s and stays on the code screen', async (status, message) => {
		mockConfirmLink.mockResolvedValue({ status, data: { reason: 'x' } });
		const { result } = renderHook(() => useAuthenticationPasscode());

		await submitCode(result, 'ABCD1234');

		expect(result.current.status).toBe('error');
		expect(result.current.errors).toEqual({ code: message });
		expect(result.current.authScreen.screen).toBe('passcode');
		expect(result.current.everIdConfirm).toBe(true);
		expect(mockReplace).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('shows the unavailable message when the call itself fails', async () => {
		mockConfirmLink.mockRejectedValue(new TypeError('Failed to fetch'));
		const { result } = renderHook(() => useAuthenticationPasscode());

		await submitCode(result, 'ABCD1234');

		expect(result.current.status).toBe('error');
		expect(result.current.errors).toEqual({ code: 'pages.auth.everId.UNAVAILABLE' });
		expect(result.current.authScreen.screen).toBe('passcode');
		expect(result.current.everIdConfirmLoading).toBe(false);
	});

	it('checks the code length before calling anything', async () => {
		const { result } = renderHook(() => useAuthenticationPasscode());

		await submitCode(result, 'AB');

		expect(mockConfirmLink).not.toHaveBeenCalled();
		expect(result.current.errors.code).toBeTruthy();
	});

	it.each([
		['another step', 'ever_id=signup'],
		['an old key parameter', 'ever_id_handoff=k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA'],
		['nothing', '']
	])('shows the usual e-mail screen for %s', (_label, query) => {
		mockQuery = query;

		const { result } = renderHook(() => useAuthenticationPasscode());

		expect(result.current.everIdConfirm).toBe(false);
		expect(result.current.authScreen.screen).toBe('email');
	});

	it('leaving the step does nothing on any other sign-in', () => {
		mockQuery = '';
		window.history.replaceState(null, '', '/auth/passcode?email=person%40example.test');
		const { result } = renderHook(() => useAuthenticationPasscode());
		act(() => result.current.setFormValues((values) => ({ ...values, code: 'ABCD1234' })));

		act(() => result.current.leaveEverIdStep());

		expect(result.current.formValues.code).toBe('ABCD1234');
		expect(window.location.search).toBe('?email=person%40example.test');
	});
});
