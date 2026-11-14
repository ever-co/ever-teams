/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockSignOut = jest.fn();
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

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) => {
		if (!values) {
			return key;
		}
		return `${key} ${JSON.stringify(values)}`;
	},
	useFormatter: () => ({
		dateTime: (value: Date) => `date(${value.toISOString().slice(0, 10)})`,
		relativeTime: (value: Date) => `ago(${value.toISOString().slice(0, 10)})`
	}),
	useNow: () => new Date('2026-11-14T12:00:00.000Z')
}));
jest.mock('@/core/components/icons', () => ({
	Desktop: () => <span data-icon="desktop" />,
	Smartphone: () => <span data-icon="phone" />,
	Globe: () => <span data-icon="unknown" />,
	Spinner: () => null
}));
jest.mock('@/core/hooks/settings/use-user-sessions', () => ({
	useUserSessions: () => mockState
}));
jest.mock('./sign-out-others-dialog', () => ({
	SignOutOthersDialog: ({ open, count }: { open: boolean; count: number }) =>
		open ? <div role="dialog">{`dialog for ${count}`}</div> : null
}));

import { SessionsSection } from './sessions-section';

const THIS_DEVICE = {
	id: 'session-1',
	current: true,
	app: 'WEB',
	browser: 'Chrome 131',
	os: 'Windows',
	userAgent: null,
	ipAddress: null,
	signedInAt: '2026-11-10T08:00:00.000Z',
	lastActiveAt: '2026-11-14T11:58:00.000Z'
};
const LAPTOP = {
	...THIS_DEVICE,
	id: 'session-2',
	current: false,
	browser: 'Firefox 133',
	os: 'Linux',
	lastActiveAt: '2026-11-13T18:00:00.000Z'
};
const UNKNOWN = { ...THIS_DEVICE, id: 'session-3', current: false, app: 'UNKNOWN', browser: null, os: null };

function stateWith(overrides: Record<string, unknown>) {
	return {
		sessions: [],
		isLoading: false,
		isError: false,
		isUnavailable: false,
		retry: mockRetry,
		signOut: mockSignOut,
		signingOutId: null,
		...overrides
	};
}

function failure(status: number, code?: string) {
	return {
		message: `Request failed with status code ${status}`,
		status,
		response: { data: { code, message: 'refused' }, headers: {}, status, statusText: '' }
	};
}

describe('SessionsSection', () => {
	beforeEach(() => {
		mockSignOut.mockReset();
		mockRetry.mockReset();
		mockToastSuccess.mockReset();
		mockToastError.mockReset();
	});

	it('lists each session with its device and dates, this device marked and without its own Sign out', () => {
		mockState = stateWith({ sessions: [THIS_DEVICE, LAPTOP, UNKNOWN] });

		render(<SessionsSection />);

		expect(screen.getByText('settings.sessions.TITLE')).toBeTruthy();
		expect(screen.getByText(/settings\.sessions\.DEVICE_BROWSER_ON .*Chrome 131.*Windows/)).toBeTruthy();
		expect(screen.getByText(/settings\.sessions\.DEVICE_BROWSER_ON .*Firefox 133.*Linux/)).toBeTruthy();
		expect(screen.getByText('settings.sessions.UNKNOWN_DEVICE')).toBeTruthy();
		expect(screen.getByText('settings.sessions.THIS_DEVICE')).toBeTruthy();
		expect(screen.getAllByText(/settings\.sessions\.SIGNED_IN .*date\(2026-11-10\)/)).toHaveLength(3);
		expect(screen.getByText(/settings\.sessions\.LAST_ACTIVE .*ago\(2026-11-13\)/)).toBeTruthy();
		expect(screen.getAllByRole('button', { name: /settings\.sessions\.SIGN_OUT_SESSION/ })).toHaveLength(2);
	});

	it('offers to sign out the other sessions and opens the confirmation with their count', () => {
		mockState = stateWith({ sessions: [THIS_DEVICE, LAPTOP, UNKNOWN] });
		render(<SessionsSection />);

		fireEvent.click(screen.getByRole('button', { name: 'settings.sessions.SIGN_OUT_OTHERS' }));

		expect(screen.getByRole('dialog').textContent).toBe('dialog for 2');
	});

	it('says this device is the only session, and offers nothing to sign out', () => {
		mockState = stateWith({ sessions: [THIS_DEVICE] });

		render(<SessionsSection />);

		expect(screen.getByText('settings.sessions.ONLY_THIS_DEVICE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'settings.sessions.SIGN_OUT_OTHERS' })).toBeNull();
	});

	it('shows placeholder rows while the sessions load', () => {
		mockState = stateWith({ isLoading: true });

		const { container } = render(<SessionsSection />);

		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
		expect(screen.queryByText('settings.sessions.THIS_DEVICE')).toBeNull();
	});

	it('says the list failed to load and retries on demand', () => {
		mockState = stateWith({ isError: true });
		render(<SessionsSection />);

		expect(screen.getByText('settings.sessions.LOAD_FAILED')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'settings.sessions.RETRY' }));

		expect(mockRetry).toHaveBeenCalledTimes(1);
	});

	it('renders nothing against an API without sessions', () => {
		mockState = stateWith({ isUnavailable: true });

		const { container } = render(<SessionsSection />);

		expect(container.innerHTML).toBe('');
	});

	it('signs one session out and says which one', async () => {
		mockState = stateWith({ sessions: [THIS_DEVICE, LAPTOP] });
		mockSignOut.mockResolvedValue(undefined);
		render(<SessionsSection />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /settings\.sessions\.SIGN_OUT_SESSION/ }));
		});

		expect(mockSignOut).toHaveBeenCalledWith('session-2');
		expect(mockToastSuccess).toHaveBeenCalledTimes(1);
		expect(mockToastSuccess.mock.calls[0][0]).toMatch(/^settings\.sessions\.SIGNED_OUT_ONE .*Firefox 133/);
	});

	it("explains a session older than the list, which Gauzy only signs out with the others'", async () => {
		mockState = stateWith({ sessions: [THIS_DEVICE, LAPTOP] });
		mockSignOut.mockRejectedValue(failure(409, 'SESSION_UNNAMED'));
		render(<SessionsSection />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /settings\.sessions\.SIGN_OUT_SESSION/ }));
		});

		expect(mockToastError).toHaveBeenCalledWith('settings.sessions.SIGN_OUT_FAILED', {
			description: 'settings.sessions.SIGN_OUT_UNNAMED'
		});
	});

	it('says a sign-out failed, with the reason', async () => {
		mockState = stateWith({ sessions: [THIS_DEVICE, LAPTOP] });
		mockSignOut.mockRejectedValue(failure(500));
		render(<SessionsSection />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: /settings\.sessions\.SIGN_OUT_SESSION/ }));
		});

		expect(mockToastError).toHaveBeenCalledWith('settings.sessions.SIGN_OUT_FAILED', {
			description: 'toasts.REASONS.SERVER'
		});
	});
});
