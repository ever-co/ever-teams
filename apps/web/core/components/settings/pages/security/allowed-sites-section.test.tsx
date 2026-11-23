/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockEndSite = jest.fn();
const mockRetry = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
let mockState: Record<string, unknown> = {};

jest.mock('sonner', () => ({
	toast: {
		success: (...args: unknown[]) => mockToastSuccess(...args),
		error: (...args: unknown[]) => mockToastError(...args)
	}
}));
jest.mock('next-intl', () => {
	const { dayOf, translationKey } = jest.requireActual('@/test/i18n/translation-keys');
	return {
		useTranslations: () => translationKey,
		useFormatter: () => ({ dateTime: dayOf })
	};
});
jest.mock('@/core/components/icons', () => ({
	Globe: () => <span data-icon="site" />
}));
// The name this app gives itself, whatever APP_NAME the machine running the tests sets
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	APP_NAME: 'Ever Teams'
}));
jest.mock('@/core/hooks/settings/use-embed-site-grants', () => ({
	useEmbedSiteGrants: () => mockState
}));

type DialogMockProps = {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	isPending: boolean;
	error?: string | null;
	onClose: () => void;
	onConfirm: () => void;
};

jest.mock('@/core/components/settings/kit/danger', () => ({
	ConfirmDestructiveDialog: (props: DialogMockProps) => {
		if (!props.open) {
			return null;
		}
		return (
			<div role="dialog" aria-label={props.title}>
				<p>{props.description}</p>
				{props.error && <p role="alert">{props.error}</p>}
				<button type="button" onClick={props.onClose}>
					close
				</button>
				<button type="button" disabled={props.isPending} onClick={props.onConfirm}>
					{`confirm ${props.confirmLabel}`}
				</button>
			</div>
		);
	}
}));

import { AllowedSitesSection } from './allowed-sites-section';

const TEAM = { id: 'grant-2', origin: 'https://team.example.com', expiresAt: '2026-12-20T09:00:00.000Z' };
const PORTAL = { id: 'grant-1', origin: 'https://portal.example.com:8443', expiresAt: '2026-12-01T09:00:00.000Z' };

function stateWith(overrides: Record<string, unknown>) {
	return {
		grants: [],
		isLoading: false,
		isError: false,
		isUnavailable: false,
		retry: mockRetry,
		endSite: mockEndSite,
		endingId: null,
		...overrides
	};
}

function failure(status: number) {
	return {
		message: `Request failed with status code ${status}`,
		status,
		response: { data: { message: 'refused' }, headers: {}, status, statusText: '' }
	};
}

function askToEnd(site: string) {
	fireEvent.click(screen.getByRole('button', { name: `settings.allowedSites.END: ${site}` }));
}

async function confirm() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'confirm settings.allowedSites.END' }));
	});
}

describe('AllowedSitesSection', () => {
	beforeEach(() => {
		mockEndSite.mockReset();
		mockRetry.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
	});

	it('lists each site with its address, until when it can renew the sign-in, and its End button', () => {
		mockState = stateWith({ grants: [TEAM, PORTAL] });

		render(<AllowedSitesSection />);

		expect(screen.getByText('settings.allowedSites.TITLE')).toBeTruthy();
		expect(screen.getByText('settings.allowedSites.DESCRIPTION {"appName":"Ever Teams"}')).toBeTruthy();
		expect(screen.getByText('https://team.example.com')).toBeTruthy();
		expect(screen.getByText('https://portal.example.com:8443')).toBeTruthy();
		expect(screen.getByText('settings.allowedSites.RENEWS_UNTIL {"date":"date(2026-12-20)"}')).toBeTruthy();
		expect(screen.getByText('settings.allowedSites.RENEWS_UNTIL {"date":"date(2026-12-01)"}')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'settings.allowedSites.END: team.example.com' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'settings.allowedSites.END: portal.example.com:8443' })).toBeTruthy();
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('leaves out the date of a site whose date does not read', () => {
		mockState = stateWith({ grants: [{ ...TEAM, expiresAt: 'soon' }] });

		render(<AllowedSitesSection />);

		expect(screen.getByText('https://team.example.com')).toBeTruthy();
		expect(screen.queryByText(/settings\.allowedSites\.RENEWS_UNTIL/)).toBeNull();
	});

	it('says no site was signed in from, under the title, when the list is empty', () => {
		mockState = stateWith({ grants: [] });

		render(<AllowedSitesSection />);

		expect(screen.getByText('settings.allowedSites.TITLE')).toBeTruthy();
		expect(screen.getByText('settings.allowedSites.EMPTY')).toBeTruthy();
	});

	it('shows placeholder rows while the sites load, and no empty note', () => {
		mockState = stateWith({ isLoading: true });

		const { container } = render(<AllowedSitesSection />);

		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
		expect(screen.queryByText('settings.allowedSites.EMPTY')).toBeNull();
	});

	it('says the list failed to load and retries on demand', () => {
		mockState = stateWith({ isError: true });
		render(<AllowedSitesSection />);

		expect(screen.getByText('settings.allowedSites.LOAD_FAILED')).toBeTruthy();
		expect(screen.queryByText('settings.allowedSites.EMPTY')).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: 'settings.allowedSites.RETRY' }));

		expect(mockRetry).toHaveBeenCalledTimes(1);
	});

	it('renders nothing on a server without embeds', () => {
		mockState = stateWith({ isUnavailable: true });

		const { container } = render(<AllowedSitesSection />);

		expect(container.innerHTML).toBe('');
	});

	it('asks before ending a site, naming it, and ends nothing when the person closes', () => {
		mockState = stateWith({ grants: [TEAM, PORTAL] });
		render(<AllowedSitesSection />);

		askToEnd('team.example.com');

		const dialog = screen.getByRole('dialog');
		expect(dialog.getAttribute('aria-label')).toBe('settings.allowedSites.END_TITLE {"site":"team.example.com"}');
		expect(screen.getByText('settings.allowedSites.END_DESCRIPTION {"appName":"Ever Teams"}')).toBeTruthy();
		expect(mockEndSite).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'close' }));

		expect(screen.queryByRole('dialog')).toBeNull();
		expect(mockEndSite).not.toHaveBeenCalled();
	});

	it('ends the site once confirmed, closes the confirmation and says which site', async () => {
		mockState = stateWith({ grants: [TEAM, PORTAL] });
		mockEndSite.mockResolvedValue(undefined);
		render(<AllowedSitesSection />);
		askToEnd('portal.example.com:8443');

		await confirm();

		expect(mockEndSite).toHaveBeenCalledWith('grant-1');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(mockToastSuccess).toHaveBeenCalledWith('settings.allowedSites.ENDED {"site":"portal.example.com:8443"}');
	});

	it('keeps the confirmation open on a refusal, with a message that says what to do', async () => {
		mockState = stateWith({ grants: [TEAM] });
		mockEndSite.mockRejectedValue(failure(500));
		render(<AllowedSitesSection />);
		askToEnd('team.example.com');

		await confirm();

		expect(screen.getByRole('alert').textContent).toBe('settings.allowedSites.END_FAILED');
		expect(screen.getByRole('dialog')).toBeTruthy();
		expect(mockToastSuccess).not.toHaveBeenCalled();
	});

	it('clears the refusal when the person asks again', async () => {
		mockState = stateWith({ grants: [TEAM] });
		mockEndSite.mockRejectedValueOnce(failure(500));
		mockEndSite.mockResolvedValueOnce(undefined);
		render(<AllowedSitesSection />);
		askToEnd('team.example.com');
		await confirm();

		await confirm();

		expect(mockEndSite).toHaveBeenCalledTimes(2);
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(mockToastSuccess).toHaveBeenCalledTimes(1);
	});

	it('reads a sign-in that was already gone as ended', async () => {
		mockState = stateWith({ grants: [TEAM] });
		mockEndSite.mockRejectedValue(failure(404));
		render(<AllowedSitesSection />);
		askToEnd('team.example.com');

		await confirm();

		expect(screen.queryByRole('dialog')).toBeNull();
		expect(mockToastSuccess).toHaveBeenCalledWith('settings.allowedSites.ENDED {"site":"team.example.com"}');
	});

	it('keeps the confirmation open, and the End buttons off, while a site is being ended', () => {
		mockState = stateWith({ grants: [TEAM, PORTAL] });
		const { rerender } = render(<AllowedSitesSection />);
		askToEnd('team.example.com');
		mockState = stateWith({ grants: [TEAM, PORTAL], endingId: 'grant-2' });
		rerender(<AllowedSitesSection />);

		fireEvent.click(screen.getByRole('button', { name: 'close' }));

		expect(screen.getByRole('dialog')).toBeTruthy();
		const endButtons = screen.getAllByRole('button', { name: /^settings\.allowedSites\.END: / });
		expect(endButtons.map((button) => (button as HTMLButtonElement).disabled)).toEqual([true, true]);
	});
});
