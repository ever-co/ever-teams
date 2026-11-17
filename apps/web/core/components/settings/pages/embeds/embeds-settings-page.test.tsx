/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { embedsAvailabilityOf } from '@/core/hooks/settings/use-embeds';
import { EmbedsSettingsPage } from './embeds-settings-page';

const mockUseAvailability = jest.fn();
const mockUseOrigins = jest.fn();
const mockUseCredentials = jest.fn();
const mockAddOrigin = jest.fn();

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string, values?: Record<string, string | number>) => {
		if (!values) {
			return key;
		}
		return `${key} ${Object.values(values).join(' ')}`;
	}
}));
jest.mock('@/core/hooks/settings/use-embeds', () => ({
	embedsAvailabilityOf: jest.requireActual('@/core/hooks/settings/use-embeds').embedsAvailabilityOf,
	useEmbedsAvailability: () => mockUseAvailability(),
	useEmbedAllowedOrigins: () => mockUseOrigins(),
	useEmbedCredentials: () => mockUseCredentials(),
	useAddEmbedOrigin: () => ({ mutate: mockAddOrigin, isPending: false, isError: false, error: null }),
	useRemoveEmbedOrigin: () => ({ mutate: jest.fn(), isPending: false }),
	useRevokeEmbedCredential: () => ({ mutate: jest.fn(), isPending: false })
}));
jest.mock('./create-embed-credential-dialog', () => ({
	CreateEmbedCredentialDialog: ({ open }: { open: boolean }) => (open ? <p>create dialog</p> : null)
}));
jest.mock('@/core/components/settings/kit/danger', () => ({
	ConfirmDestructiveDialog: ({ open, title }: { open: boolean; title: string }) => (open ? <p>{title}</p> : null)
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) => (
		<div role="alert">
			<p>{title}</p>
			<p>{description}</p>
			{actions}
		</div>
	)
}));

const ready = { isLoading: false, isError: false, refetch: jest.fn() };

beforeEach(() => {
	jest.clearAllMocks();
	mockUseOrigins.mockReturnValue({ ...ready, origins: [] });
	mockUseCredentials.mockReturnValue({ ...ready, credentials: [] });
});

describe('embedsAvailabilityOf', () => {
	it('reads the config answer, a 404 as off and a 403 as not an administrator', () => {
		expect(embedsAvailabilityOf({ status: 'success', data: { enabled: true }, error: null })).toBe('enabled');
		expect(embedsAvailabilityOf({ status: 'success', data: { enabled: false }, error: null })).toBe('disabled');
		expect(embedsAvailabilityOf({ status: 'error', data: undefined, error: { status: 404 } })).toBe('disabled');
		expect(embedsAvailabilityOf({ status: 'error', data: undefined, error: { status: 403 } })).toBe('forbidden');
		expect(embedsAvailabilityOf({ status: 'error', data: undefined, error: { status: 502 } })).toBe('error');
		expect(embedsAvailabilityOf({ status: 'pending', data: undefined, error: null })).toBe('loading');
	});
});

describe('EmbedsSettingsPage', () => {
	it('explains how a server administrator turns embeds on, and lists nothing', () => {
		mockUseAvailability.mockReturnValue({ availability: 'disabled', retry: jest.fn() });
		render(<EmbedsSettingsPage />);

		expect(screen.getByText('settings.embeds.UNAVAILABLE_TEXT GAUZY_EMBED_TOKENS_ENABLED')).toBeTruthy();
		expect(mockUseOrigins).not.toHaveBeenCalled();
		expect(mockUseCredentials).not.toHaveBeenCalled();
	});

	it('tells a member that only administrators manage embeds', () => {
		mockUseAvailability.mockReturnValue({ availability: 'forbidden', retry: jest.fn() });
		render(<EmbedsSettingsPage />);

		expect(screen.getByText('settings.embeds.ADMINS_ONLY_TITLE')).toBeTruthy();
	});

	it('lists the allowed sites and the credentials, never a secret', () => {
		mockUseAvailability.mockReturnValue({ availability: 'enabled', retry: jest.fn() });
		mockUseOrigins.mockReturnValue({
			...ready,
			origins: [{ id: 'o1', origin: 'https://app.northwind.example', createdAt: '2026-11-17T10:00:00.000Z' }]
		});
		mockUseCredentials.mockReturnValue({
			...ready,
			credentials: [{ id: 'c1', name: 'Northwind product', prefix: 'gze_abcdefgh', lastUsedAt: null }]
		});
		render(<EmbedsSettingsPage />);

		expect(screen.getByText('https://app.northwind.example')).toBeTruthy();
		expect(screen.getByText('Northwind product')).toBeTruthy();
		expect(screen.getByText('gze_abcdefgh')).toBeTruthy();
		expect(screen.getByText('settings.embeds.NEVER_USED')).toBeTruthy();
	});

	it('refuses a site with a path before asking the platform, and sends a bare origin', () => {
		mockUseAvailability.mockReturnValue({ availability: 'enabled', retry: jest.fn() });
		render(<EmbedsSettingsPage />);
		const input = screen.getByLabelText('settings.embeds.ORIGIN_LABEL');

		fireEvent.change(input, { target: { value: 'https://app.example.com/timer' } });
		fireEvent.click(screen.getByText('settings.embeds.ADD_ORIGIN'));
		expect(mockAddOrigin).not.toHaveBeenCalled();
		expect(screen.getByText('settings.embeds.ORIGIN_INVALID')).toBeTruthy();

		fireEvent.change(input, { target: { value: 'https://app.example.com' } });
		fireEvent.click(screen.getByText('settings.embeds.ADD_ORIGIN'));
		expect(mockAddOrigin).toHaveBeenCalledWith('https://app.example.com', expect.anything());
	});

	it('shows the empty states, and opens the credential dialog', () => {
		mockUseAvailability.mockReturnValue({ availability: 'enabled', retry: jest.fn() });
		render(<EmbedsSettingsPage />);

		expect(screen.getByText('settings.embeds.NO_ORIGINS')).toBeTruthy();
		expect(screen.getByText('settings.embeds.NO_CREDENTIALS')).toBeTruthy();
		fireEvent.click(screen.getByText('settings.embeds.CREATE'));
		expect(screen.getByText('create dialog')).toBeTruthy();
	});
});
