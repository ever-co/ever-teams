/**
 * @jest-environment jsdom
 *
 * The sign-up page in Ever ID mode (`/auth/signup?ever_id=signup`): the verified name and e-mail come from the
 * server (which holds the one-time key in a cookie this page cannot read), and nothing is submitted until the
 * person ticks the confirmation (and accepts the documents the account requires). Without the marker the sign-up
 * is the usual one.
 */
import { act, renderHook, waitFor } from '@testing-library/react';

const TERMS = [
	{ documentId: 'tos:gauzy', version: '1.0.2', sha256: 'a'.repeat(64), locale: 'en', title: 'Terms of Service' },
	{ documentId: 'privacy:gauzy', version: '1.0.2', sha256: 'b'.repeat(64), locale: 'en', title: 'Privacy Policy' }
];
const mockPush = jest.fn();
const mockPrefill = jest.fn();
const mockEverIdRegister = jest.fn();
const mockRegisterUserTeam = jest.fn();
let mockQuery = 'ever_id=signup';

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

type Hook = { current: ReturnType<typeof useAuthenticationTeam> };

const submit = (result: Hook) =>
	act(async () => {
		result.current.handleSubmit({ preventDefault() {} } as unknown as React.FormEvent<HTMLFormElement>);
		await new Promise((resolve) => setTimeout(resolve, 0));
	});

async function renderPrefilled(name = 'New Person') {
	mockPrefill.mockResolvedValue({
		status: 200,
		data: { name, email: 'new.person@example.test', terms: TERMS, flow: 'flow-of-this-sign-up' }
	});
	const hook = renderHook(() => useAuthenticationTeam());
	await waitFor(() => expect(hook.result.current.everId?.prefill).toBeTruthy());
	return hook;
}

/** Ticks both boxes and goes through both steps of the form (the solo default team name). */
async function confirmAndSubmit(result: Hook) {
	act(() => {
		result.current.everId?.setConfirmed(true);
		result.current.everId?.setTermsAccepted(true);
	});
	await submit(result); // step 1 -> step 2
	expect(result.current.step).toBe('STEP2');
	await submit(result);
}

beforeEach(() => {
	mockQuery = 'ever_id=signup';
	jest.resetAllMocks();
});

describe('useAuthenticationTeam in Ever ID mode', () => {
	it('reads the verified name and e-mail address from the server and fills them in', async () => {
		const { result } = await renderPrefilled();

		expect(mockPrefill).toHaveBeenCalledWith('fr');
		expect(result.current.formValues.name).toBe('New Person');
		expect(result.current.formValues.email).toBe('new.person@example.test');
		expect(result.current.everId?.prefill?.terms).toHaveLength(2);
		expect(result.current.everId?.nameVerified).toBe(true);
	});

	it('marks the Ever ID as being read (not as creating the workspace), and a submit then shows no error', async () => {
		let answer: (value: unknown) => void = () => undefined;
		mockPrefill.mockReturnValue(new Promise((resolve) => (answer = resolve)));
		const { result } = renderHook(() => useAuthenticationTeam());

		expect(result.current.everId?.loading).toBe(true);
		// `loading` shows the "creating your new workplace" backdrop: not while only reading the Ever ID.
		expect(result.current.loading).toBe(false);
		await submit(result);
		expect(result.current.errors.everId).toBeUndefined();
		expect(result.current.everId?.error).toBeNull();

		await act(async () => {
			answer({
				status: 200,
				data: { name: 'New Person', email: 'new.person@example.test', terms: [], flow: 'flow-1' }
			});
		});
		expect(result.current.everId?.loading).toBe(false);
		expect(result.current.loading).toBe(false);
	});

	it('submits nothing until the confirmation is ticked', async () => {
		const { result } = await renderPrefilled();

		await submit(result);

		expect(result.current.errors.everId).toBe('pages.auth.everId.SIGNUP_CONFIRM_REQUIRED');
		expect(result.current.step).toBe('STEP1');
		expect(mockEverIdRegister).not.toHaveBeenCalled();
		expect(mockRegisterUserTeam).not.toHaveBeenCalled();
	});

	it('asks for the documents to be accepted as well, and a ticked box clears the message', async () => {
		const { result } = await renderPrefilled();
		act(() => result.current.everId?.setConfirmed(true));

		await submit(result);
		expect(result.current.errors.everId).toBe('pages.auth.everId.SIGNUP_TERMS_REQUIRED');
		expect(mockEverIdRegister).not.toHaveBeenCalled();

		act(() => result.current.everId?.setTermsAccepted(true));
		expect(result.current.errors.everId).toBe('');
	});

	it('creates the workspace through the Ever ID sign-up once confirmed, with the accepted documents', async () => {
		mockEverIdRegister.mockResolvedValue({ status: 200, data: {} });
		const { result } = await renderPrefilled();

		await confirmAndSubmit(result);

		expect(mockEverIdRegister).toHaveBeenCalledTimes(1);
		expect(mockEverIdRegister).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'New Person',
				email: 'new.person@example.test',
				team: "New Person's Team",
				ever_id: 'signup',
				ever_id_flow: 'flow-of-this-sign-up',
				confirm: true,
				verified_name: true,
				terms: TERMS.map(({ documentId, version, sha256, locale }) => ({ documentId, version, sha256, locale }))
			})
		);
		expect(JSON.stringify(mockEverIdRegister.mock.calls[0][0])).not.toContain('handoff');
		expect(mockRegisterUserTeam).not.toHaveBeenCalled();
		expect(mockPush).toHaveBeenCalledWith('/');
	});

	it('lets the person enter a name when the Ever ID has none (or one too short), and says so', async () => {
		mockEverIdRegister.mockResolvedValue({ status: 200, data: {} });
		const { result } = await renderPrefilled('N');

		expect(result.current.everId?.nameVerified).toBe(false);
		act(() => result.current.handleOnChange({ target: { name: 'name', value: 'Mary Jane Smith' } }));
		await confirmAndSubmit(result);

		expect(mockEverIdRegister).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'Mary Jane Smith', verified_name: false })
		);
	});

	it('goes to checkout when the API asks for a subscription first', async () => {
		// jsdom cannot leave the page: it reports the navigation instead of making it.
		const reported = jest.spyOn(console, 'error').mockImplementation(() => undefined);
		try {
			mockEverIdRegister.mockResolvedValue({
				status: 403,
				data: { checkoutUrl: 'https://billing.example.test/checkout/1' }
			});
			const { result } = await renderPrefilled();

			await confirmAndSubmit(result);

			expect(result.current.step).toBe('STEP2');
			expect(result.current.everId?.error).toBeNull();
			expect(mockPush).not.toHaveBeenCalled();
		} finally {
			reported.mockRestore();
		}
	});

	it('is the usual sign-up again, not busy, when the marker leaves the URL while the Ever ID is still read', async () => {
		mockPrefill.mockReturnValue(new Promise(() => undefined));
		const hook = renderHook(() => useAuthenticationTeam());
		expect(hook.result.current.everId?.loading).toBe(true);

		mockQuery = '';
		hook.rerender();

		expect(hook.result.current.everId).toBeNull();
		expect(hook.result.current.loading).toBe(false);
	});

	it.each([
		[
			'a used key (410)',
			{ status: 410, data: { errors: { email: 'expired' } } },
			'pages.auth.everId.SIGNUP_EXPIRED'
		],
		['too many attempts (429)', { status: 429, data: {} }, 'pages.auth.everId.TOO_MANY_ATTEMPTS'],
		[
			'another Ever ID sign-in in this browser since (409)',
			{ status: 409, data: { errors: { email: 'replaced' } } },
			'pages.auth.everId.SIGNUP_EXPIRED'
		],
		[
			'a refused sign-up (400)',
			{ status: 400, data: { errors: { confirm: 'Accept the required documents.' } } },
			'Accept the required documents.'
		],
		['an API failure (502)', { status: 502, data: {} }, 'pages.auth.everId.UNAVAILABLE'],
		[
			'a checkout link that is not https (403)',
			{ status: 403, data: { checkoutUrl: 'http://billing.example.test/checkout/1' } },
			'pages.auth.everId.UNAVAILABLE'
		]
	])('shows what went wrong on the first step for %s', async (_label, answer, message) => {
		mockEverIdRegister.mockResolvedValue(answer);
		const { result } = await renderPrefilled();

		await confirmAndSubmit(result);

		expect(result.current.step).toBe('STEP1');
		expect(result.current.everId?.error).toBe(message);
		expect(mockPush).not.toHaveBeenCalled();
	});

	it('shows the unavailable message on the first step when the call itself fails', async () => {
		mockEverIdRegister.mockRejectedValue(new TypeError('Failed to fetch'));
		const { result } = await renderPrefilled();

		await confirmAndSubmit(result);

		expect(result.current.step).toBe('STEP1');
		expect(result.current.everId?.error).toBe('pages.auth.everId.UNAVAILABLE');
		expect(result.current.loading).toBe(false);
	});

	it.each([
		[410, 'pages.auth.everId.SIGNUP_EXPIRED'],
		[429, 'pages.auth.everId.TOO_MANY_ATTEMPTS'],
		[502, 'pages.auth.everId.UNAVAILABLE']
	])('shows the message of a prefill answer %s, and submits nothing', async (status, message) => {
		mockPrefill.mockResolvedValue({ status, data: { reason: 'x' } });

		const { result } = renderHook(() => useAuthenticationTeam());

		await waitFor(() => expect(result.current.everId?.error).toBe(message));
		expect(result.current.everId?.prefill).toBeNull();
		await submit(result);
		expect(result.current.errors.everId).toBe(message);
		expect(mockEverIdRegister).not.toHaveBeenCalled();
	});

	it('shows the unavailable message when the prefill call itself fails', async () => {
		mockPrefill.mockRejectedValue(new TypeError('Failed to fetch'));

		const { result } = renderHook(() => useAuthenticationTeam());

		await waitFor(() => expect(result.current.everId?.error).toBe('pages.auth.everId.UNAVAILABLE'));
		expect(result.current.everId?.loading).toBe(false);
	});
});

describe('useAuthenticationTeam without the marker', () => {
	it.each([
		['no parameter', ''],
		['an old key parameter', 'ever_id_handoff=k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA'],
		['another step', 'ever_id=confirm']
	])('is the usual sign-up for %s', (_label, query) => {
		mockQuery = query;

		const { result } = renderHook(() => useAuthenticationTeam());

		expect(result.current.everId).toBeNull();
		expect(mockPrefill).not.toHaveBeenCalled();
	});
});
