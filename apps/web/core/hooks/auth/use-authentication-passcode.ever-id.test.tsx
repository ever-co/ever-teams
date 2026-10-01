/**
 * @jest-environment jsdom
 *
 * The passcode page in Ever ID mode (`/auth/passcode?ever_id_handoff=<key>`): the Gauzy API found an existing
 * account with the Ever ID's verified address and sent its own one-time code there. The code goes to
 * /api/auth/ever-id/confirm with the key (never an e-mail address, which this page does not know), and on
 * success the usual workspace chooser follows. The passcode hook's other paths are covered by
 * use-authentication-passcode.test.tsx.
 */
import { act, renderHook } from '@testing-library/react';

const HANDOFF = 'k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA';
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockConfirmLink = jest.fn();
const mockEmailConfirm = jest.fn();
let mockQuery = `ever_id_handoff=${HANDOFF}`;

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

async function submitCode(result: { current: ReturnType<typeof useAuthenticationPasscode> }, code: string) {
	act(() => result.current.setFormValues((values) => ({ ...values, code })));
	await act(async () => {
		result.current.handleCodeSubmit({ preventDefault() {} } as unknown as React.FormEvent<HTMLFormElement>);
		await new Promise((resolve) => setTimeout(resolve, 0));
	});
}

beforeEach(() => {
	mockQuery = `ever_id_handoff=${HANDOFF}`;
	jest.resetAllMocks();
});

describe('useAuthenticationPasscode in Ever ID mode', () => {
	it('starts on the code screen, without an e-mail address', () => {
		const { result } = renderHook(() => useAuthenticationPasscode());

		expect(result.current.everIdHandoff).toBe(HANDOFF);
		expect(result.current.authScreen.screen).toBe('passcode');
		expect(result.current.formValues.email).toBe('');
	});

	it('sends the key and the code to the Ever ID route and continues with the workspace chooser', async () => {
		mockConfirmLink.mockResolvedValue({
			status: 200,
			data: {
				workspaces: [workspace('u1', 't1', 'Acme'), workspace('u2', 't2', 'Beta')],
				confirmed_email: 'person@example.test',
				show_popup: true,
				total_workspaces: 2
			}
		});
		const { result } = renderHook(() => useAuthenticationPasscode());

		await submitCode(result, 'ABCD1234');

		expect(mockConfirmLink).toHaveBeenCalledWith(HANDOFF, 'ABCD1234');
		expect(mockEmailConfirm).not.toHaveBeenCalled();
		expect(result.current.authScreen.screen).toBe('workspace');
		expect(result.current.workspaces.map((entry) => entry.token)).toEqual([
			'workspace-token-u1',
			'workspace-token-u2'
		]);
		expect(result.current.everIdTeamsUnavailable).toBe(true);
		// The workspace sign-in that follows needs the address: it comes from the answer, not from the URL.
		expect(result.current.formValues.email).toBe('person@example.test');
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
	});

	it('checks the code length before calling anything', async () => {
		const { result } = renderHook(() => useAuthenticationPasscode());

		await submitCode(result, 'AB');

		expect(mockConfirmLink).not.toHaveBeenCalled();
		expect(result.current.errors.code).toBeTruthy();
	});

	it('ignores a parameter that is not a hand-off key (the usual e-mail screen)', () => {
		mockQuery = 'ever_id_handoff=person@example.test';

		const { result } = renderHook(() => useAuthenticationPasscode());

		expect(result.current.everIdHandoff).toBeNull();
		expect(result.current.authScreen.screen).toBe('email');
	});
});
