/**
 * @jest-environment jsdom
 *
 * The sign-up page in Ever ID mode (`/auth/signup?ever_id_handoff=<key>`): the verified name and e-mail come
 * from the server by the one-time key, and nothing is submitted until the person ticks the confirmation (and
 * accepts the documents the account requires). Without the key the sign-up is the usual one.
 */
import { act, renderHook, waitFor } from '@testing-library/react';

const HANDOFF = 'k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA';
const TERMS = [
	{ documentId: 'tos:gauzy', version: '1.0.2', sha256: 'a'.repeat(64), locale: 'en', title: 'Terms of Service' },
	{ documentId: 'privacy:gauzy', version: '1.0.2', sha256: 'b'.repeat(64), locale: 'en', title: 'Privacy Policy' }
];
const mockPush = jest.fn();
const mockPrefill = jest.fn();
const mockEverIdRegister = jest.fn();
const mockRegisterUserTeam = jest.fn();
let mockQuery = `ever_id_handoff=${HANDOFF}`;

jest.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush, replace: jest.fn() }),
	useSearchParams: () => new URLSearchParams(mockQuery)
}));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'fr' }));
jest.mock('@/core/services/client/api/auth/auth.service', () => ({
	authService: { registerUserTeam: (...args: unknown[]) => mockRegisterUserTeam(...args) }
}));
jest.mock('@/core/services/client/api/auth/ever-id.service', () => ({
	everIdService: {
		signupPrefill: (...args: unknown[]) => mockPrefill(...args),
		register: (...args: unknown[]) => mockEverIdRegister(...args)
	}
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useAuthenticationTeam } = require('./use-authentication-team') as typeof import('./use-authentication-team');

const submit = (result: { current: ReturnType<typeof useAuthenticationTeam> }) =>
	act(async () => {
		result.current.handleSubmit({ preventDefault() {} } as unknown as React.FormEvent<HTMLFormElement>);
		await new Promise((resolve) => setTimeout(resolve, 0));
	});

async function renderPrefilled() {
	mockPrefill.mockResolvedValue({
		status: 200,
		data: { name: 'New Person', email: 'new.person@example.test', terms: TERMS }
	});
	const hook = renderHook(() => useAuthenticationTeam());
	await waitFor(() => expect(hook.result.current.everId?.prefill).toBeTruthy());
	return hook;
}

beforeEach(() => {
	mockQuery = `ever_id_handoff=${HANDOFF}`;
	jest.resetAllMocks();
});

describe('useAuthenticationTeam in Ever ID mode', () => {
	it('reads the verified name and e-mail address by the key and fills them in', async () => {
		const { result } = await renderPrefilled();

		expect(mockPrefill).toHaveBeenCalledWith(HANDOFF, 'fr');
		expect(result.current.formValues.name).toBe('New Person');
		expect(result.current.formValues.email).toBe('new.person@example.test');
		expect(result.current.everId?.prefill?.terms).toHaveLength(2);
	});

	it('submits nothing until the confirmation is ticked', async () => {
		const { result } = await renderPrefilled();

		await submit(result);

		expect(result.current.errors.everId).toBe('pages.auth.everId.SIGNUP_CONFIRM_REQUIRED');
		expect(result.current.step).toBe('STEP1');
		expect(mockEverIdRegister).not.toHaveBeenCalled();
		expect(mockRegisterUserTeam).not.toHaveBeenCalled();
	});

	it('asks for the documents to be accepted as well', async () => {
		const { result } = await renderPrefilled();
		act(() => result.current.everId?.setConfirmed(true));

		await submit(result);

		expect(result.current.errors.everId).toBe('pages.auth.everId.SIGNUP_TERMS_REQUIRED');
		expect(mockEverIdRegister).not.toHaveBeenCalled();
	});

	it('creates the workspace through the Ever ID sign-up once confirmed, with the accepted documents', async () => {
		mockEverIdRegister.mockResolvedValue({ status: 200, data: {} });
		const { result } = await renderPrefilled();
		act(() => {
			result.current.everId?.setConfirmed(true);
			result.current.everId?.setTermsAccepted(true);
		});

		await submit(result); // step 1 -> step 2
		expect(result.current.step).toBe('STEP2');
		await submit(result); // the solo default: "<name>'s Team"

		expect(mockEverIdRegister).toHaveBeenCalledTimes(1);
		expect(mockEverIdRegister).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'New Person',
				email: 'new.person@example.test',
				team: "New Person's Team",
				ever_id_handoff: HANDOFF,
				confirm: true,
				terms: TERMS.map(({ documentId, version, sha256, locale }) => ({ documentId, version, sha256, locale }))
			})
		);
		expect(mockRegisterUserTeam).not.toHaveBeenCalled();
		expect(mockPush).toHaveBeenCalledWith('/');
	});

	it('shows the expiry message for a used key', async () => {
		mockPrefill.mockResolvedValue({ status: 410, data: { reason: 'expired' } });

		const { result } = renderHook(() => useAuthenticationTeam());

		await waitFor(() => expect(result.current.everId?.error).toBe('pages.auth.everId.SIGNUP_EXPIRED'));
		expect(result.current.everId?.prefill).toBeNull();
	});
});

describe('useAuthenticationTeam without the key', () => {
	it('is the usual sign-up', () => {
		mockQuery = '';

		const { result } = renderHook(() => useAuthenticationTeam());

		expect(result.current.everId).toBeNull();
		expect(mockPrefill).not.toHaveBeenCalled();
	});
});
