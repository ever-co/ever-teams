/** @jest-environment jsdom */

// cspell:ignore Northwind
/**
 * `/embed/authorize` (#5528): what a person sees for each state of the popup, and where the tokens go. The API, the
 * person's organizations and the account panel are stand-ins; the site's page is a stand-in opener.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EmbedAuthorizePage } from './embed-authorize-page';

const SITE = 'https://team.example.com';
const TOKENS = {
	token: 'header.claims.signature',
	expiresAt: '2026-11-19T10:15:00.000Z',
	renewalToken: 'gzr_renewal-token',
	renewalExpiresAt: '2026-12-19T10:00:00.000Z'
};

let mockQuery = new URLSearchParams();
let mockAccessToken: string | null = 'access-token';
const mockOrganizations = jest.fn();
const mockAuthorize = jest.fn();
const mockReset = jest.fn();
let mockIsAllowing = false;
const mockSetPathAfterSignIn = jest.fn();

jest.mock('next/navigation', () => ({ useSearchParams: () => mockQuery }));
jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string | number>) => {
		if (!values) {
			return key;
		}
		return `${key} ${Object.values(values).join(' ')}`;
	}
}));
jest.mock('@/core/hooks/auth/use-reactive-access-token-cookie', () => ({
	useReactiveAccessTokenCookie: () => mockAccessToken
}));
jest.mock('@/core/hooks/organizations/teams/use-team-menu-organizations', () => ({
	useTeamMenuOrganizations: () => mockOrganizations()
}));
jest.mock('@/core/hooks/embeds/use-authorize-embed-site', () => ({
	useAuthorizeEmbedSite: () => ({ mutate: mockAuthorize, reset: mockReset, isPending: mockIsAllowing })
}));
jest.mock('@/core/lib/auth/navigate-after-sign-in', () => ({
	setPathAfterSignIn: (path: string | null) => mockSetPathAfterSignIn(path)
}));
jest.mock('@/core/components/layouts/focus/signed-in-account', () => ({
	SignedInAccount: ({ onNotYou, disabled }: { onNotYou?: () => void; disabled?: boolean }) => (
		<button type="button" disabled={disabled} onClick={onNotYou}>
			not you
		</button>
	)
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title }: { title: string }) => <p role="alert">{title}</p>
}));

const opener = { closed: false, postMessage: jest.fn() };
const close = jest.fn();

const STATE = '0123456789abcdef0123456789abcdef';
const QUERY = `origin=${encodeURIComponent(SITE)}&organization=organization-1&state=${STATE}`;

function openFromSite(search = QUERY) {
	window.history.replaceState(null, '', `/embed/authorize?${search}`);
	mockQuery = new URLSearchParams(search);
	Object.defineProperty(window, 'opener', { value: opener, configurable: true, writable: true });
}

const organizationsRead = {
	isPending: false,
	isError: false,
	data: { current: { id: 'organization-1', name: 'Northwind' }, others: [] },
	refetch: jest.fn()
};

beforeAll(() => {
	Object.defineProperty(window, 'close', { value: close, configurable: true });
});

beforeEach(() => {
	jest.clearAllMocks();
	mockAccessToken = 'access-token';
	mockIsAllowing = false;
	mockOrganizations.mockReturnValue(organizationsRead);
	openFromSite();
});

const allowButton = () => screen.getByRole('button', { name: 'pages.embedAuthorize.ALLOW' });
const cancelButton = () => screen.getByRole('button', { name: 'pages.embedAuthorize.CANCEL' });

describe('EmbedAuthorizePage', () => {
	it("shows the site as text, the organization's name, what the site may do, Allow and Cancel", () => {
		render(<EmbedAuthorizePage />);

		expect(screen.getByText(SITE)).toBeTruthy();
		expect(screen.getByText('Northwind')).toBeTruthy();
		expect(screen.getByText('pages.embedAuthorize.PERMISSION')).toBeTruthy();
		expect(allowButton()).toBeTruthy();
		expect(cancelButton()).toBeTruthy();
		expect(opener.postMessage).not.toHaveBeenCalled();
	});

	it('Allow asks the API, hands the tokens to the exact origin of the site only, and closes', () => {
		mockAuthorize.mockImplementation((_request, { onSuccess }) => onSuccess(TOKENS));
		render(<EmbedAuthorizePage />);

		act(() => {
			fireEvent.click(allowButton());
		});

		expect(mockAuthorize).toHaveBeenCalledWith(
			{ origin: SITE, organizationId: 'organization-1' },
			expect.any(Object)
		);
		expect(opener.postMessage).toHaveBeenCalledTimes(1);
		expect(opener.postMessage).toHaveBeenCalledWith(
			{ type: 'ever-teams:embed-authorized', state: STATE, ...TOKENS },
			SITE
		);
		expect(mockReset).toHaveBeenCalled();
		expect(close).toHaveBeenCalled();
		expect(window.location.href.includes(TOKENS.token)).toBe(false);
		expect(screen.getByText('pages.embedAuthorize.ALLOWED_TITLE')).toBeTruthy();
	});

	it('Cancel tells the site the person said no, to its exact origin, and closes', () => {
		render(<EmbedAuthorizePage />);

		fireEvent.click(cancelButton());

		expect(opener.postMessage).toHaveBeenCalledWith({ type: 'ever-teams:embed-denied', state: STATE }, SITE);
		expect(close).toHaveBeenCalled();
		expect(screen.getByText('pages.embedAuthorize.CANCELLED_TITLE')).toBeTruthy();
	});

	it.each([
		['EMBED_ORIGIN_NOT_ALLOWED', 'pages.embedAuthorize.REFUSED_SITE_NOT_ALLOWED'],
		['EMBED_SITE_SIGN_IN_OFF', 'pages.embedAuthorize.REFUSED_SIGN_IN_OFF'],
		['EMBED_MEMBER_NOT_ALLOWED', 'pages.embedAuthorize.REFUSED_MEMBER_NOT_ALLOWED']
	])('explains the refusal %s in one sentence and posts nothing', (code, sentence) => {
		mockAuthorize.mockImplementation((_request, { onError }) => onError({ statusCode: 403, errorCode: code }));
		render(<EmbedAuthorizePage />);

		act(() => {
			fireEvent.click(allowButton());
		});

		expect(screen.getByRole('alert').textContent).toBe(sentence);
		expect(opener.postMessage).not.toHaveBeenCalled();
		expect(close).not.toHaveBeenCalled();
	});

	it('locks both buttons and Not you while the API answers', () => {
		mockIsAllowing = true;
		render(<EmbedAuthorizePage />);

		expect((allowButton() as HTMLButtonElement).disabled).toBe(true);
		expect((cancelButton() as HTMLButtonElement).disabled).toBe(true);
		expect((screen.getByRole('button', { name: 'not you' }) as HTMLButtonElement).disabled).toBe(true);
	});

	it('hands nothing to the site once Not you started, even if the API answers after', () => {
		let answer: (tokens: typeof TOKENS) => void = () => undefined;
		mockAuthorize.mockImplementation((_request, { onSuccess }) => (answer = onSuccess));
		render(<EmbedAuthorizePage />);

		act(() => {
			fireEvent.click(allowButton());
		});
		fireEvent.click(screen.getByRole('button', { name: 'not you' }));
		act(() => answer(TOKENS));

		expect(opener.postMessage).not.toHaveBeenCalled();
		expect(close).not.toHaveBeenCalled();
		expect(mockReset).toHaveBeenCalled();
	});

	it('shown in a frame, offers no Allow', () => {
		const top = Object.getOwnPropertyDescriptor(window, 'top');
		Object.defineProperty(window, 'top', { value: {}, configurable: true });
		try {
			render(<EmbedAuthorizePage />);

			expect(screen.getByText('pages.embedAuthorize.NO_OPENER_TITLE')).toBeTruthy();
			expect(screen.queryByRole('button')).toBeNull();
		} finally {
			if (top) {
				Object.defineProperty(window, 'top', top);
			}
		}
	});

	it.each([
		['no origin', `organization=organization-1&state=${STATE}`],
		[
			'a path after the origin',
			`origin=${encodeURIComponent(`${SITE}/page`)}&organization=organization-1&state=${STATE}`
		],
		[
			'another scheme',
			`origin=${encodeURIComponent('javascript:alert(1)')}&organization=organization-1&state=${STATE}`
		],
		['no organization', `origin=${encodeURIComponent(SITE)}&state=${STATE}`],
		['no state', `origin=${encodeURIComponent(SITE)}&organization=organization-1`]
	])('says the link is not valid with %s, and posts nothing', (_case, search) => {
		openFromSite(search);
		render(<EmbedAuthorizePage />);

		expect(screen.getByText('pages.embedAuthorize.INVALID_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
		expect(opener.postMessage).not.toHaveBeenCalled();
	});

	it('opened without a site, says to go back to the site and click its button again', () => {
		Object.defineProperty(window, 'opener', { value: null, configurable: true, writable: true });
		render(<EmbedAuthorizePage />);

		expect(screen.getByText('pages.embedAuthorize.NO_OPENER_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('signed out, offers to sign in and to come back to this page after', () => {
		mockAccessToken = null;
		render(<EmbedAuthorizePage />);

		fireEvent.click(screen.getByRole('button', { name: 'pages.embedAuthorize.SIGN_IN' }));

		expect(mockSetPathAfterSignIn).toHaveBeenCalledWith(`/embed/authorize?${QUERY}`);
		expect(mockOrganizations).not.toHaveBeenCalled();
	});

	it("an account that is not a member of the site's organization gets no Allow, only Cancel and Not you", () => {
		mockOrganizations.mockReturnValue({ ...organizationsRead, data: { current: null, others: [] } });
		render(<EmbedAuthorizePage />);

		expect(screen.getByText('pages.embedAuthorize.NOT_MEMBER_TITLE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'pages.embedAuthorize.ALLOW' })).toBeNull();

		fireEvent.click(screen.getByRole('button', { name: 'not you' }));
		expect(mockSetPathAfterSignIn).toHaveBeenCalledWith(`/embed/authorize?${QUERY}`);
	});

	it('shows a loading card while the organizations are read, and a retry when the read failed', () => {
		mockOrganizations.mockReturnValue({ ...organizationsRead, isPending: true, data: undefined });
		const { unmount } = render(<EmbedAuthorizePage />);
		expect(screen.getByLabelText('pages.embedAuthorize.LOADING').getAttribute('aria-busy')).toBe('true');
		unmount();

		mockOrganizations.mockReturnValue({ ...organizationsRead, isError: true, data: undefined });
		render(<EmbedAuthorizePage />);
		fireEvent.click(screen.getByRole('button', { name: 'pages.embedAuthorize.RETRY' }));
		expect(organizationsRead.refetch).toHaveBeenCalled();
	});
});
