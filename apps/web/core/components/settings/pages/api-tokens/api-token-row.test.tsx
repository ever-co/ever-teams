/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { TUserApiToken } from '@/core/types/schemas/user/user-api-token.schema';
import { ApiTokenRow } from './api-token-row';

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string, values?: Record<string, string>) => {
		if (!values) {
			return key;
		}
		return `${key} ${Object.values(values).join(' ')}`;
	}
}));

const NOW = new Date('2026-11-14T12:00:00.000Z');

function token(overrides: Partial<TUserApiToken> = {}): TUserApiToken {
	return {
		id: 'token-1',
		name: 'Friday report',
		createdAt: '2026-11-01T09:00:00.000Z',
		expiresAt: '2027-01-30T09:00:00.000Z',
		lastUsedAt: '2026-11-13T08:00:00.000Z',
		...overrides
	};
}

it('says when the token was made, last used and ends', () => {
	render(<ApiTokenRow token={token()} now={NOW} onRevoke={jest.fn()} />);

	expect(screen.getByTitle('Friday report').textContent).toBe('Friday report');
	expect(screen.getByText('settings.apiTokens.CREATED_ON Nov 1, 2026')).toBeTruthy();
	expect(screen.getByText('settings.apiTokens.LAST_USED_ON Nov 13, 2026')).toBeTruthy();
	expect(screen.getByText('settings.apiTokens.EXPIRES_ON Jan 30, 2027')).toBeTruthy();
	expect(screen.queryByText('settings.apiTokens.EXPIRED')).toBeNull();
});

it('says a token was never used and never ends', () => {
	render(<ApiTokenRow token={token({ expiresAt: null, lastUsedAt: null })} now={NOW} onRevoke={jest.fn()} />);

	expect(screen.getByText('settings.apiTokens.NEVER_USED')).toBeTruthy();
	expect(screen.getByText('settings.apiTokens.NEVER_EXPIRES')).toBeTruthy();
});

it('marks an expired token and says when it ended', () => {
	render(<ApiTokenRow token={token({ expiresAt: '2026-11-10T09:00:00.000Z' })} now={NOW} onRevoke={jest.fn()} />);

	expect(screen.getByText('settings.apiTokens.EXPIRED')).toBeTruthy();
	expect(screen.getByText('settings.apiTokens.EXPIRED_ON Nov 10, 2026')).toBeTruthy();
});

it('keeps a long name on one line, readable in full on hover', () => {
	const longName = 'A very long token name that a person typed to remember which nightly export script uses it';
	render(<ApiTokenRow token={token({ name: longName })} now={NOW} onRevoke={jest.fn()} />);

	const name = screen.getByTitle(longName);
	expect(name.getAttribute('title')).toBe(longName);
	expect(name.className).toContain('truncate');
});

it('asks to revoke this token, by a button named after it', () => {
	const onRevoke = jest.fn();
	render(<ApiTokenRow token={token()} now={NOW} onRevoke={onRevoke} />);

	fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.REVOKE Friday report' }));

	expect(onRevoke).toHaveBeenCalledWith(token());
});
