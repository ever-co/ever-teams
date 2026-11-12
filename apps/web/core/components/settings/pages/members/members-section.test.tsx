/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import type { InactiveMember } from '@/core/lib/utils/member-access';
import { MembersSection } from './members-section';

const mockUseTeamMembersSettings = jest.fn();
const mockUseInactiveMembers = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key} ${JSON.stringify(values)}` : key,
	useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) })
}));
jest.mock('@/core/hooks/settings/use-team-members-settings', () => ({
	useTeamMembersSettings: () => mockUseTeamMembersSettings()
}));
jest.mock('@/core/hooks/settings/use-inactive-members', () => ({
	useInactiveMembers: (isShown: boolean) => mockUseInactiveMembers(isShown)
}));
// The row's menus have their own primitives: here a row only hands its member to the section.
jest.mock('./member-row', () => ({
	MemberRow: ({
		row,
		actions
	}: {
		row: MemberRowModel;
		actions: { onRequestDeactivate: (row: MemberRowModel) => void };
	}) => (
		<li>
			{row.name}
			<button type="button" onClick={() => actions.onRequestDeactivate(row)}>
				deactivate {row.name}
			</button>
		</li>
	)
}));
jest.mock('@/core/components/settings/kit/danger', () => ({
	ConfirmDestructiveDialog: ({
		open,
		title,
		consequences,
		confirmLabel,
		confirmDisabled,
		isPending,
		error,
		onClose,
		onConfirm
	}: {
		open: boolean;
		title: string;
		consequences: Array<{ key: string; text: string }>;
		confirmLabel: string;
		confirmDisabled?: boolean;
		isPending: boolean;
		error?: string | null;
		onClose: () => void;
		onConfirm: () => void;
	}) => {
		if (!open) {
			return null;
		}
		return (
			<div role="dialog" aria-label={title}>
				<button type="button" onClick={onClose}>
					close
				</button>
				<ul>
					{consequences.map((consequence) => (
						<li key={consequence.key}>{consequence.text}</li>
					))}
				</ul>
				{error && <p role="alert">{error}</p>}
				<button type="button" onClick={onConfirm} disabled={Boolean(confirmDisabled) || isPending}>
					{confirmLabel}
				</button>
			</div>
		);
	}
}));

const ANA = { id: 'row-ana', name: 'Ana Lima', email: 'ana@example.com', canDeactivate: true } as MemberRowModel;

const BO: InactiveMember = {
	employeeId: 'employee-bo',
	name: 'Bo Chen',
	email: 'bo@example.com',
	imageUrl: null,
	deactivatedAt: new Date('2026-11-05T09:00:00.000Z')
};

function membersSettings(overrides: Record<string, unknown> = {}) {
	return {
		teamName: 'Team A',
		rows: [ANA],
		assignableRoles: [],
		changeRole: jest.fn(),
		changeWorkspaceRole: jest.fn(),
		deactivateMember: jest.fn().mockResolvedValue(undefined),
		removeMember: jest.fn(),
		renameMember: jest.fn(),
		setMemberTracking: jest.fn(),
		saveMemberRates: jest.fn(),
		...overrides
	};
}

function inactiveMembers(overrides: Record<string, unknown> = {}) {
	return {
		members: [BO],
		canList: true,
		canRestore: true,
		isLoading: false,
		isError: false,
		retry: jest.fn(),
		busyIds: new Set<string>(),
		restore: jest.fn(),
		...overrides
	};
}

function renderSection() {
	return render(<MembersSection onInvite={jest.fn()} canInvite />);
}

beforeEach(() => {
	jest.clearAllMocks();
	mockUseTeamMembersSettings.mockReturnValue(membersSettings());
	mockUseInactiveMembers.mockReturnValue(inactiveMembers());
});

describe('the Active and Inactive lists', () => {
	it('offers no Inactive list to a viewer the API would refuse it to', () => {
		mockUseInactiveMembers.mockReturnValue(inactiveMembers({ canList: false, members: [] }));

		renderSection();

		expect(screen.queryByRole('tablist')).toBeNull();
		expect(screen.getByText('Ana Lima')).toBeTruthy();
	});

	it('opens on the active members and reads the inactive ones only once they are asked for', () => {
		renderSection();

		expect(mockUseInactiveMembers).toHaveBeenLastCalledWith(false);
		expect(screen.getByText('Ana Lima')).toBeTruthy();
		expect(screen.queryByText('Bo Chen')).toBeNull();

		fireEvent.click(screen.getByRole('tab', { name: 'settings.members.FILTER_INACTIVE' }));

		expect(mockUseInactiveMembers).toHaveBeenLastCalledWith(true);
		expect(screen.getByText('Bo Chen')).toBeTruthy();
		expect(screen.queryByText('Ana Lima')).toBeNull();
	});

	it('restores the member whose Restore is pressed', () => {
		const restore = jest.fn();
		mockUseInactiveMembers.mockReturnValue(inactiveMembers({ restore }));
		renderSection();
		fireEvent.click(screen.getByRole('tab', { name: 'settings.members.FILTER_INACTIVE' }));

		fireEvent.click(screen.getByRole('button', { name: 'settings.members.RESTORE_MEMBER {"name":"Bo Chen"}' }));

		expect(restore).toHaveBeenCalledWith(BO);
	});

	it('lists the inactive members without Restore for a viewer who may not restore', () => {
		mockUseInactiveMembers.mockReturnValue(inactiveMembers({ canRestore: false }));
		renderSection();

		fireEvent.click(screen.getByRole('tab', { name: 'settings.members.FILTER_INACTIVE' }));

		expect(screen.getByText('Bo Chen')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /RESTORE_MEMBER/ })).toBeNull();
	});
});

describe('the Deactivate confirmation', () => {
	it('says what changes, then deactivates the member once confirmed', async () => {
		const deactivateMember = jest.fn().mockResolvedValue(undefined);
		mockUseTeamMembersSettings.mockReturnValue(membersSettings({ deactivateMember }));
		renderSection();

		fireEvent.click(screen.getByRole('button', { name: 'deactivate Ana Lima' }));

		const dialog = screen.getByRole('dialog', { name: 'settings.members.DEACTIVATE_TITLE {"name":"Ana Lima"}' });
		const consequences = within(dialog)
			.getAllByRole('listitem')
			.map((item) => item.textContent);
		expect(consequences).toEqual([
			'settings.members.DEACTIVATE_CONSEQUENCE_ACCESS {"name":"Ana Lima"}',
			'settings.members.DEACTIVATE_CONSEQUENCE_TEAMS',
			'settings.members.DEACTIVATE_CONSEQUENCE_HISTORY',
			'settings.members.DEACTIVATE_CONSEQUENCE_RESTORE'
		]);
		expect(deactivateMember).not.toHaveBeenCalled();

		await act(async () => {
			fireEvent.click(within(dialog).getByRole('button', { name: 'settings.members.DEACTIVATE' }));
		});

		expect(deactivateMember).toHaveBeenCalledWith('row-ana');
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('keeps the dialog open with the reason when the API refuses', async () => {
		const deactivateMember = jest.fn().mockRejectedValue({ status: 403 });
		mockUseTeamMembersSettings.mockReturnValue(membersSettings({ deactivateMember }));
		renderSection();
		fireEvent.click(screen.getByRole('button', { name: 'deactivate Ana Lima' }));

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.members.DEACTIVATE' }));
		});

		expect(screen.getByRole('alert').textContent).toBe('toasts.REASONS.PERMISSION');
		expect(screen.getByRole('dialog')).toBeTruthy();
	});

	it('stays open when it is asked to close while the deactivation is on its way', async () => {
		let finish: () => void = () => undefined;
		const answer = new Promise<void>((resolve) => {
			finish = resolve;
		});
		const deactivateMember = jest.fn().mockReturnValue(answer);
		mockUseTeamMembersSettings.mockReturnValue(membersSettings({ deactivateMember }));
		renderSection();
		fireEvent.click(screen.getByRole('button', { name: 'deactivate Ana Lima' }));
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'settings.members.DEACTIVATE' }));
		});

		fireEvent.click(screen.getByRole('button', { name: 'close' }));

		expect(screen.getByRole('dialog')).toBeTruthy();

		await act(async () => {
			finish();
		});

		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('cannot be confirmed once the member can no longer be deactivated', () => {
		const view = renderSection();
		fireEvent.click(screen.getByRole('button', { name: 'deactivate Ana Lima' }));

		mockUseTeamMembersSettings.mockReturnValue(membersSettings({ rows: [{ ...ANA, canDeactivate: false }] }));
		view.rerender(<MembersSection onInvite={jest.fn()} canInvite />);

		const confirm = screen.getByRole('button', { name: 'settings.members.DEACTIVATE' });
		expect((confirm as HTMLButtonElement).disabled).toBe(true);
	});
});
