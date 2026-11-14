/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ApiTokenSecret } from './api-token-secret';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

const SECRET = 'gzy_abc.0123456789';

function setClipboard(writeText: ((text: string) => Promise<void>) | undefined) {
	Object.defineProperty(navigator, 'clipboard', {
		configurable: true,
		value: writeText ? { writeText } : undefined
	});
}

afterEach(() => {
	setClipboard(undefined);
});

it('shows the secret read only, with its copy button drawn at rest', () => {
	render(<ApiTokenSecret value={SECRET} />);

	const field = screen.getByLabelText('settings.apiTokens.SECRET_LABEL') as HTMLInputElement;
	expect(field.value).toBe(SECRET);
	expect(field.readOnly).toBe(true);
	expect(screen.getByRole('button', { name: 'settings.apiTokens.COPY_TOKEN' })).toBeTruthy();
});

it('copies the secret and says so in a status region outside the button, keeping the button name', async () => {
	const writeText = jest.fn().mockResolvedValue(undefined);
	setClipboard(writeText);
	render(<ApiTokenSecret value={SECRET} />);
	const button = screen.getByRole('button', { name: 'settings.apiTokens.COPY_TOKEN' });

	await act(async () => {
		fireEvent.click(button);
	});

	expect(writeText).toHaveBeenCalledWith(SECRET);
	const status = screen.getByRole('status');
	expect(status.textContent).toBe('settings.apiTokens.COPY_DONE');
	expect(button.contains(status)).toBe(false);
	expect(button.getAttribute('aria-label')).toBe('settings.apiTokens.COPY_TOKEN');
	expect(button.textContent).toContain('settings.apiTokens.COPIED');
});

it('selects the secret and says how to copy it when the browser has no clipboard', async () => {
	render(<ApiTokenSecret value={SECRET} />);
	const field = screen.getByLabelText('settings.apiTokens.SECRET_LABEL') as HTMLInputElement;

	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.COPY_TOKEN' }));
	});

	expect(screen.getByRole('status').textContent).toBe('settings.apiTokens.COPY_FAILED');
	expect(document.activeElement).toBe(field);
	expect(field.selectionStart).toBe(0);
	expect(field.selectionEnd).toBe(SECRET.length);
});

it('says the copy failed when the browser refuses it', async () => {
	setClipboard(jest.fn().mockRejectedValue(new Error('denied')));
	render(<ApiTokenSecret value={SECRET} />);

	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'settings.apiTokens.COPY_TOKEN' }));
	});

	expect(screen.getByRole('status').textContent).toBe('settings.apiTokens.COPY_FAILED');
});
