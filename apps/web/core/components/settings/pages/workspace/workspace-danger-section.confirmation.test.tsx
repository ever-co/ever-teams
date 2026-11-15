/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceDangerSection } from './workspace-danger-section';

// The confirmation as the person meets it: the real destructive dialog, which holds the delete until the name is typed
const mockDelete = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));
jest.mock('@/core/hooks/settings/use-organization-deletion', () => ({
	useOrganizationDeletion: () => ({
		canDelete: true,
		status: 'ready',
		counts: { teams: 2, projects: 3, members: 4, trackedSeconds: 5400, invoices: 5, estimates: 1 },
		block: null,
		landing: { id: 'org-real', name: 'Ever Technologies' },
		retry: jest.fn(),
		deleteOrganization: mockDelete
	})
}));

function openConfirmation() {
	render(<WorkspaceDangerSection organization={{ id: 'org-trial', name: 'Trial' }} />);
	fireEvent.click(screen.getByRole('button', { name: 'settings.workspace.deletion.DELETE_ACTION' }));
}

function confirmButton() {
	const buttons = screen.getAllByRole('button', { name: 'settings.workspace.deletion.DELETE_ACTION' });
	return buttons.at(-1) as HTMLButtonElement;
}

function typeName(name: string) {
	fireEvent.change(screen.getByRole('textbox'), { target: { value: name } });
}

beforeEach(() => {
	mockDelete.mockReset();
});

it("keeps the delete off until the organization's name is typed exactly", () => {
	openConfirmation();
	expect(confirmButton().disabled).toBe(true);

	typeName('trial');
	expect(confirmButton().disabled).toBe(true);

	typeName('Trial');
	expect(confirmButton().disabled).toBe(false);
});

it('sends one delete while it runs, however often confirm is pressed', async () => {
	mockDelete.mockImplementation(() => new Promise<void>(() => undefined));
	openConfirmation();
	typeName('Trial');

	await act(async () => {
		fireEvent.click(confirmButton());
	});
	expect(confirmButton().disabled).toBe(true);
	await act(async () => {
		fireEvent.click(confirmButton());
	});

	expect(mockDelete).toHaveBeenCalledTimes(1);
});
