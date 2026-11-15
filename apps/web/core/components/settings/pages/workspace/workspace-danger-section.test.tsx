/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceDangerSection } from './workspace-danger-section';

const ORGANIZATION = { id: 'org-trial', name: 'Trial' };
const COUNTS = { teams: 2, projects: 3, members: 4, trackedSeconds: 5400, invoices: 5, estimates: 1 };

const mockRetry = jest.fn();
const mockDelete = jest.fn(async () => undefined);
let mockDeletion: Record<string, unknown> = {};
const mockHookCalls: Array<{ isConfirmOpen: boolean }> = [];

function deletionOf(overrides: Record<string, unknown> = {}) {
	return {
		canDelete: true,
		status: 'ready',
		counts: COUNTS,
		block: null,
		landing: { id: 'org-real', name: 'Ever Technologies' },
		retry: mockRetry,
		deleteOrganization: mockDelete,
		...overrides
	};
}

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key
}));
jest.mock('@/core/hooks/settings/use-organization-deletion', () => ({
	useOrganizationDeletion: (_organization: unknown, isConfirmOpen: boolean) => {
		mockHookCalls.push({ isConfirmOpen });
		return mockDeletion;
	}
}));
jest.mock('@/core/components/common/notice', () => ({
	Notice: ({
		title,
		description,
		actions
	}: {
		title: React.ReactNode;
		description?: React.ReactNode;
		actions?: React.ReactNode;
	}) => (
		<div role="status">
			{title}
			{description}
			{actions}
		</div>
	)
}));
jest.mock('@/core/components/settings/kit/danger', () => ({
	DangerRow: ({ label, actionLabel, onAction }: { label: string; actionLabel: string; onAction: () => void }) => (
		<div>
			{label}
			<button type="button" onClick={onAction}>
				{actionLabel}
			</button>
		</div>
	),
	ConfirmDestructiveDialog: ({
		open,
		title,
		consequences = [],
		confirmationText,
		confirmLabel,
		confirmDisabled,
		error,
		onConfirm,
		children
	}: {
		open: boolean;
		title: string;
		consequences?: Array<{ key: string; text: React.ReactNode }>;
		confirmationText?: string;
		confirmLabel: string;
		confirmDisabled?: boolean;
		error?: string | null;
		onConfirm: () => void;
		children?: React.ReactNode;
	}) => {
		if (!open) {
			return null;
		}
		return (
			<div role="dialog" aria-label={title}>
				<ul>
					{consequences.map((consequence) => (
						<li key={consequence.key}>{consequence.text}</li>
					))}
				</ul>
				{children}
				{confirmationText && <p>type {confirmationText}</p>}
				{error && <p role="alert">{error}</p>}
				<button type="button" onClick={onConfirm} disabled={confirmDisabled}>
					{confirmLabel}
				</button>
			</div>
		);
	}
}));

function openConfirmation() {
	render(<WorkspaceDangerSection organization={ORGANIZATION} />);
	fireEvent.click(screen.getByRole('button', { name: 'settings.workspace.deletion.DELETE_ACTION' }));
	return screen.getByRole('dialog');
}

function confirmButton() {
	return screen.getAllByRole('button', { name: 'settings.workspace.deletion.DELETE_ACTION' }).at(-1) as HTMLElement;
}

beforeEach(() => {
	mockDeletion = deletionOf();
	mockHookCalls.length = 0;
	mockRetry.mockClear();
	mockDelete.mockReset();
	mockDelete.mockResolvedValue(undefined);
});

it('shows no danger zone to a role Gauzy does not let delete the organization', () => {
	mockDeletion = deletionOf({ canDelete: false });
	const { container } = render(<WorkspaceDangerSection organization={ORGANIZATION} />);

	expect(container.innerHTML).toBe('');
});

it('asks for the counts only once the confirmation opens', () => {
	render(<WorkspaceDangerSection organization={ORGANIZATION} />);
	expect(mockHookCalls.at(-1)).toEqual({ isConfirmOpen: false });

	fireEvent.click(screen.getByRole('button', { name: 'settings.workspace.deletion.DELETE_ACTION' }));

	expect(mockHookCalls.at(-1)).toEqual({ isConfirmOpen: true });
});

it('lists what goes with the real counts and asks for the organization name', () => {
	const dialog = openConfirmation();

	expect(dialog.textContent).toContain('settings.workspace.deletion.CONSEQUENCE_TEAMS {"count":2}');
	expect(dialog.textContent).toContain('settings.workspace.deletion.CONSEQUENCE_MEMBERS {"count":4}');
	expect(dialog.textContent).toContain('settings.workspace.deletion.CONSEQUENCE_WORK {"projects":3,"hours":1.5}');
	expect(dialog.textContent).toContain('settings.workspace.deletion.CONSEQUENCE_INVOICES {"count":5}');
	expect(dialog.textContent).toContain(
		'settings.workspace.deletion.CONSEQUENCE_LANDING {"organization":"Ever Technologies"}'
	);
	expect(dialog.textContent).toContain('type Trial');
	expect((confirmButton() as HTMLButtonElement).disabled).toBe(false);
});

it('says the person goes to the workspace list when they have no other organization', () => {
	mockDeletion = deletionOf({ landing: null });
	const dialog = openConfirmation();

	expect(dialog.textContent).toContain('settings.workspace.deletion.CONSEQUENCE_PICKER');
});

it('keeps the delete off while the counts load', () => {
	mockDeletion = deletionOf({ status: 'loading', counts: null });
	const dialog = openConfirmation();

	expect(dialog.textContent).toContain('settings.workspace.deletion.COUNTS_LOADING');
	expect(dialog.textContent).not.toContain('CONSEQUENCE_TEAMS');
	expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);
});

it('keeps the delete off when the counts failed, and lets the person try again', () => {
	mockDeletion = deletionOf({ status: 'failed', counts: null });
	const dialog = openConfirmation();

	expect(dialog.textContent).toContain('settings.workspace.deletion.COUNTS_FAILED');
	expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);
	fireEvent.click(screen.getByRole('button', { name: 'notifications.RETRY' }));
	expect(mockRetry).toHaveBeenCalled();
});

it('offers no delete against an API without the counts, and says why', () => {
	mockDeletion = deletionOf({ status: 'unsupported', counts: null });
	const dialog = openConfirmation();

	expect(dialog.textContent).toContain('settings.workspace.deletion.UNSUPPORTED');
	expect(dialog.textContent).not.toContain('type Trial');
	expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);
});

it("explains why the workspace's last organization stays and points to account deletion", () => {
	mockDeletion = deletionOf({ block: 'lastOrganization' });
	const dialog = openConfirmation();

	expect(dialog.textContent).toContain('settings.workspace.deletion.LAST_ORGANIZATION');
	const accountDeletion = screen.getByRole('link', { name: 'settings.workspace.deletion.LAST_ORGANIZATION_ACTION' });
	expect(accountDeletion.getAttribute('href')).toBe('/delete-account');
	expect(dialog.textContent).not.toContain('type Trial');
	expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);
});

it("keeps the delete off while the person's timer runs, and says to stop it first", () => {
	mockDeletion = deletionOf({ block: 'timerRunning' });
	const dialog = openConfirmation();

	expect(dialog.textContent).toContain('settings.workspace.deletion.TIMER_RUNNING');
	expect(dialog.textContent).not.toContain('CONSEQUENCE_TEAMS');
	expect(dialog.textContent).not.toContain('type Trial');
	expect((confirmButton() as HTMLButtonElement).disabled).toBe(true);
});

it('deletes the organization once confirmed', async () => {
	openConfirmation();

	await act(async () => {
		fireEvent.click(confirmButton());
	});

	expect(mockDelete).toHaveBeenCalledTimes(1);
});

it("says why the delete failed, Gauzy's refusal of the last organization in its own words", async () => {
	mockDelete.mockRejectedValue(
		Object.assign(new Error('last'), {
			response: { status: 409, data: { statusCode: 409, code: 'ORGANIZATION_LAST_OF_WORKSPACE' } }
		})
	);
	openConfirmation();

	await act(async () => {
		fireEvent.click(confirmButton());
	});

	expect(screen.getByRole('alert').textContent).toContain('settings.workspace.deletion.LAST_ORGANIZATION_REFUSED');
});
