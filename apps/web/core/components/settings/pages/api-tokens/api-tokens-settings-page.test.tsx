/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { TUserApiToken } from '@/core/types/schemas/user/user-api-token.schema';
import { ApiTokensSettingsPage } from './api-tokens-settings-page';

const mockUseAvailability = jest.fn();
const mockUseTokens = jest.fn();
const mockRevoke = jest.fn();
const mockApiOrigin: { value: string | undefined } = { value: undefined };

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string, values?: Record<string, string | number>) => {
		if (!values) {
			return key;
		}
		return `${key} ${Object.values(values).join(' ')}`;
	}
}));
jest.mock('@/core/constants/config/constants', () => ({
	get GAUZY_API_BASE_SERVER_URL() {
		return mockApiOrigin;
	}
}));
jest.mock('@/core/hooks/settings/use-user-api-tokens', () => ({
	useUserApiTokensAvailability: () => mockUseAvailability(),
	useUserApiTokens: (enabled: boolean) => mockUseTokens(enabled),
	useRevokeUserApiToken: () => ({ mutate: mockRevoke, isPending: false, reset: jest.fn() })
}));
jest.mock('./create-api-token-dialog', () => ({
	CreateApiTokenDialog: ({ open }: { open: boolean }) => {
		if (!open) {
			return null;
		}
		return <p>create dialog</p>;
	}
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
jest.mock('@/core/components/common/app-dialog', () => ({
	APP_DIALOG_FOOTER: 'footer',
	AppDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => {
		if (!open) {
			return null;
		}
		return <div role="dialog">{children}</div>;
	}
}));
jest.mock('@/core/components/common/dialog', () => ({
	DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>
}));

function token(id: string, overrides: Partial<TUserApiToken> = {}): TUserApiToken {
	return {
		id,
		name: `Token ${id}`,
		createdAt: '2026-11-01T09:00:00.000Z',
		expiresAt: null,
		lastUsedAt: null,
		...overrides
	};
}

function listed(tokens: TUserApiToken[], state: Partial<{ isLoading: boolean; isError: boolean }> = {}) {
	const refetch = jest.fn();
	mockUseTokens.mockReturnValue({ tokens, isLoading: false, isError: false, refetch, ...state });
	return refetch;
}

beforeEach(() => {
	mockUseAvailability.mockReset();
	mockUseTokens.mockReset();
	mockRevoke.mockReset();
	mockApiOrigin.value = undefined;
	mockUseAvailability.mockReturnValue({ availability: 'enabled', retry: jest.fn() });
	listed([]);
});

describe('a server without personal API tokens', () => {
	it('says the tokens are not offered here, and never reads the list', () => {
		mockUseAvailability.mockReturnValue({ availability: 'disabled', retry: jest.fn() });

		render(<ApiTokensSettingsPage />);

		expect(screen.getByText('settings.apiTokens.UNAVAILABLE_TITLE')).toBeTruthy();
		expect(mockUseTokens).not.toHaveBeenCalledWith(true);
		expect(screen.queryByRole('button', { name: /settings.apiTokens.CREATE/ })).toBeNull();
	});

	it('offers to ask again when the server could not be asked', () => {
		const retry = jest.fn();
		mockUseAvailability.mockReturnValue({ availability: 'error', retry });

		render(<ApiTokensSettingsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.RETRY' }));

		expect(screen.getByText('settings.apiTokens.AVAILABILITY_FAILED_TITLE')).toBeTruthy();
		expect(retry).toHaveBeenCalled();
	});

	it('draws the page while the server has not answered, and reads no list yet', () => {
		mockUseAvailability.mockReturnValue({ availability: 'loading', retry: jest.fn() });

		const { container } = render(<ApiTokensSettingsPage />);

		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
		expect(mockUseTokens).not.toHaveBeenCalledWith(true);
	});
});

describe('the list of tokens', () => {
	it('says there is no token yet, and offers to create one', () => {
		render(<ApiTokensSettingsPage />);

		expect(screen.getByText('settings.apiTokens.EMPTY_TITLE')).toBeTruthy();
		fireEvent.click(screen.getAllByRole('button', { name: /settings.apiTokens.CREATE/ })[0]);
		expect(screen.getByText('create dialog')).toBeTruthy();
	});

	it('says the list could not be read, and reads it again on Try again', () => {
		const refetch = listed([], { isError: true });

		render(<ApiTokensSettingsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.RETRY' }));

		expect(screen.getByText('settings.apiTokens.LIST_FAILED_TITLE')).toBeTruthy();
		expect(refetch).toHaveBeenCalled();
	});

	it('draws placeholder rows while the list loads', () => {
		listed([], { isLoading: true });

		const { container } = render(<ApiTokensSettingsPage />);

		expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
		expect(screen.queryByText('settings.apiTokens.EMPTY_TITLE')).toBeNull();
	});

	it('lists the tokens and counts the working ones out of ten', () => {
		listed([token('a'), token('b'), token('c', { expiresAt: '2026-01-01T00:00:00.000Z' })]);

		render(<ApiTokensSettingsPage />);

		expect(screen.getByTitle('Token a')).toBeTruthy();
		expect(screen.getByTitle('Token c')).toBeTruthy();
		expect(screen.getByText('settings.apiTokens.COUNT 2 10')).toBeTruthy();
	});

	it('disables Create at ten working tokens and says why', () => {
		listed(Array.from({ length: 10 }, (_, index) => token(`t${index}`)));

		render(<ApiTokensSettingsPage />);

		const create = screen.getByRole('button', { name: /settings.apiTokens.CREATE/ }) as HTMLButtonElement;
		expect(create.disabled).toBe(true);
		expect(screen.getByText('settings.apiTokens.LIMIT_REACHED 10')).toBeTruthy();
	});
});

describe('revoking a token', () => {
	it('asks first, then revokes that token', () => {
		listed([token('a')]);
		render(<ApiTokensSettingsPage />);

		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.REVOKE Token a' }));
		expect(screen.getByText('settings.apiTokens.REVOKE_TITLE Token a')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.REVOKE_CONFIRM' }));

		expect(mockRevoke).toHaveBeenCalledWith('a', expect.any(Object));
	});

	it('says the token could not be revoked, and keeps the question open', () => {
		listed([token('a')]);
		render(<ApiTokensSettingsPage />);
		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.REVOKE Token a' }));
		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.REVOKE_CONFIRM' }));
		const options = mockRevoke.mock.calls[0][1] as { onError: (error: unknown) => void };

		act(() => {
			options.onError(new Error('offline'));
		});

		expect(screen.getByText('settings.apiTokens.REVOKE_FAILED')).toBeTruthy();
		expect(screen.getByText('settings.apiTokens.REVOKE_TITLE Token a')).toBeTruthy();
	});
});

describe('the note on scripts', () => {
	it('names the exchange address of the API the app calls directly', () => {
		mockApiOrigin.value = 'https://api.example.test';

		render(<ApiTokensSettingsPage />);

		expect(screen.getByText(/https:\/\/api\.example\.test\/api\/auth\/api-token\/exchange/)).toBeTruthy();
	});

	it('puts a placeholder for the API address when the app calls it through its own server', () => {
		render(<ApiTokensSettingsPage />);

		expect(screen.getByText(/API_URL\/api\/auth\/api-token\/exchange/)).toBeTruthy();
	});
});
