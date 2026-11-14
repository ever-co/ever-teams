/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RevokeApiTokenDialog } from './revoke-api-token-dialog';

let mockIsPending = false;

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/hooks/settings/use-user-api-tokens', () => ({
	useRevokeUserApiToken: () => ({ mutate: jest.fn(), isPending: mockIsPending })
}));
jest.mock('@/core/components/settings/kit/danger', () => ({
	ConfirmDestructiveDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) => {
		if (!open) {
			return null;
		}
		return (
			<div role="dialog">
				<button type="button" onClick={onClose}>
					close the question
				</button>
			</div>
		);
	}
}));

const TOKEN = {
	id: 'token-1',
	name: 'Friday report',
	createdAt: '2026-11-14T12:00:00.000Z',
	expiresAt: null,
	lastUsedAt: null
};

beforeEach(() => {
	mockIsPending = false;
});

it('closes when the person does not want to revoke the token', () => {
	const onClose = jest.fn();
	render(<RevokeApiTokenDialog token={TOKEN} onClose={onClose} />);

	fireEvent.click(screen.getByRole('button', { name: 'close the question' }));

	expect(onClose).toHaveBeenCalled();
});

it('stays open while the revocation runs, so its answer never lands on another token', () => {
	mockIsPending = true;
	const onClose = jest.fn();
	render(<RevokeApiTokenDialog token={TOKEN} onClose={onClose} />);

	fireEvent.click(screen.getByRole('button', { name: 'close the question' }));

	expect(onClose).not.toHaveBeenCalled();
});
