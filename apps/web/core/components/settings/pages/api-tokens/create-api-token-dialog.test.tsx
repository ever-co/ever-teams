/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CreateApiTokenDialog } from './create-api-token-dialog';

const mockMutate = jest.fn();
const mockReset = jest.fn();
let mockIsPending = false;

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string, values?: Record<string, string | number>) => {
		if (!values) {
			return key;
		}
		return `${key} ${Object.values(values).join(' ')}`;
	}
}));
jest.mock('@/core/hooks/settings/use-user-api-tokens', () => ({
	...jest.requireActual('@/core/hooks/settings/use-user-api-tokens'),
	useCreateUserApiToken: () => ({ mutate: mockMutate, reset: mockReset, isPending: mockIsPending })
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({ title }: { title: string }) => <p role="alert">{title}</p>
}));
jest.mock('@/core/components/common/app-dialog', () => ({
	APP_DIALOG_BODY: 'body',
	APP_DIALOG_FOOTER: 'footer',
	AppDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => {
		if (!open) {
			return null;
		}
		return <div role="dialog">{children}</div>;
	},
	AppDialogHeader: ({ title }: { title: string }) => <h2>{title}</h2>
}));

const NOW = new Date('2026-11-14T12:00:00.000Z');
const CREATED = {
	id: 'token-1',
	name: 'Friday report',
	createdAt: NOW.toISOString(),
	expiresAt: '2027-02-12T12:00:00.000Z',
	lastUsedAt: null,
	token: 'gzy_abc.secret'
};

type MutateOptions = { onSuccess?: (created: typeof CREATED) => void; onError?: (error: unknown) => void };

function renderDialog(onClose = jest.fn()) {
	render(<CreateApiTokenDialog open onClose={onClose} now={NOW} />);
	return onClose;
}

function typeName(name: string) {
	fireEvent.change(screen.getByLabelText('settings.apiTokens.NAME_LABEL'), { target: { value: name } });
}

function submit() {
	fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.CREATE' }));
}

beforeEach(() => {
	mockMutate.mockReset();
	mockReset.mockReset();
	mockIsPending = false;
});

it('offers 90 days, 1 year or never, 90 days chosen, each with the date it ends', () => {
	renderDialog();

	const ninetyDays = screen.getByRole('radio', { name: /settings.apiTokens.EXPIRY_90D/ }) as HTMLInputElement;
	expect(ninetyDays.checked).toBe(true);
	expect(screen.getByText('settings.apiTokens.EXPIRY_ON_DATE Feb 12, 2027')).toBeTruthy();
	expect(screen.getByText('settings.apiTokens.EXPIRY_ON_DATE Nov 14, 2027')).toBeTruthy();
	expect(screen.getByText('settings.apiTokens.EXPIRY_NEVER_DETAIL')).toBeTruthy();
});

it('asks for a name before sending anything', () => {
	renderDialog();
	typeName('   ');

	submit();

	expect(screen.getByText('settings.apiTokens.NAME_REQUIRED')).toBeTruthy();
	expect(mockMutate).not.toHaveBeenCalled();
});

it('sends the trimmed name and the chosen expiry', () => {
	renderDialog();
	typeName('  Friday report ');
	fireEvent.click(screen.getByRole('radio', { name: /^settings.apiTokens.EXPIRY_NEVER settings/ }));

	submit();

	expect(mockMutate).toHaveBeenCalledWith({ name: 'Friday report', expiry: 'never' }, expect.any(Object));
});

it('shows the secret once the token is made, and forgets it when the person is done', () => {
	const onClose = renderDialog();
	typeName('Friday report');
	submit();
	const options = mockMutate.mock.calls[0][1] as MutateOptions;

	act(() => {
		options.onSuccess?.(CREATED);
	});

	expect(screen.getByText('settings.apiTokens.SECRET_TITLE')).toBeTruthy();
	expect((screen.getByLabelText('settings.apiTokens.SECRET_LABEL') as HTMLInputElement).value).toBe('gzy_abc.secret');

	fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.DONE' }));

	expect(onClose).toHaveBeenCalled();
	expect(screen.queryByDisplayValue('gzy_abc.secret')).toBeNull();
});

it.each([
	[
		{ statusCode: 400, message: 'You can hold 10 API tokens at once. Revoke one you no longer use first.' },
		'settings.apiTokens.CREATE_LIMIT 10'
	],
	[{ statusCode: 404, message: 'Not Found' }, 'settings.apiTokens.CREATE_DISABLED'],
	[{ statusCode: 500, message: 'boom' }, 'settings.apiTokens.CREATE_FAILED']
])('says why the token was not made (%o)', (error, message) => {
	renderDialog();
	typeName('Friday report');
	submit();
	const options = mockMutate.mock.calls[0][1] as MutateOptions;

	act(() => {
		options.onError?.(error);
	});

	expect(screen.getByText(message)).toBeTruthy();
	expect((screen.getByLabelText('settings.apiTokens.NAME_LABEL') as HTMLInputElement).value).toBe('Friday report');
});

it('says it is creating, and does not send twice, while the request runs', () => {
	mockIsPending = true;
	renderDialog();
	typeName('Friday report');

	const button = screen.getByRole('button', { name: 'settings.apiTokens.CREATING' }) as HTMLButtonElement;

	expect(button.disabled).toBe(true);
});
