/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import type { WorkspaceRole } from '@/core/lib/utils/member-access';
import { MemberRow, type MemberRowActions } from './member-row';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('./member-rate-editor', () => ({
	MemberRateEditor: () => null,
	MemberRateText: () => null
}));
// Menus whose rows are always there, as plain buttons: what a menu offers is what is under test, not how it opens.
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Plain = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
	return {
		DropdownMenu: Plain,
		DropdownMenuTrigger: Plain,
		DropdownMenuContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="menu">{children}</div>,
		DropdownMenuGroup: ({ children, ...rest }: { children?: React.ReactNode; 'aria-label'?: string }) => (
			<div role="group" aria-label={rest['aria-label']}>
				{children}
			</div>
		),
		DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => <p data-testid="menu-label">{children}</p>,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuItem: ({ children, onSelect }: { children?: React.ReactNode; onSelect?: () => void }) => (
			<button type="button" role="menuitem" onClick={onSelect}>
				{children}
			</button>
		),
		DropdownMenuCheckboxItem: Plain
	};
});
jest.mock('@/core/components/common/selected-mark', () => ({
	SelectedMark: () => <span data-testid="selected" />
}));

const ADMIN: WorkspaceRole = { id: 'role-admin', name: 'ADMIN' };
const EMPLOYEE: WorkspaceRole = { id: 'role-employee', name: 'EMPLOYEE' };
const SUPPORT: WorkspaceRole = { id: 'role-support', name: 'Support desk' };

function rowOf(overrides: Partial<MemberRowModel> = {}): MemberRowModel {
	return {
		id: 'row-ana',
		name: 'Ana Lima',
		email: 'ana@example.com',
		firstName: 'Ana',
		lastName: 'Lima',
		imageUrl: null,
		joinedAt: null,
		role: 'member',
		isYou: false,
		canChangeRole: true,
		canRemove: true,
		canEditName: true,
		showsTracking: false,
		isTrackingEnabled: true,
		isTrackingLocked: false,
		isRolePending: false,
		isTrackingPending: false,
		rate: { value: null, currency: null, weeklyLimit: null },
		canEditRate: false,
		employeeId: 'employee-ana',
		workspaceRoleId: 'role-employee',
		workspaceRoleName: 'EMPLOYEE',
		canChangeWorkspaceRole: false,
		isWorkspaceRolePending: false,
		canDeactivate: false,
		...overrides
	};
}

function actionsOf(): MemberRowActions {
	return {
		onChangeRole: jest.fn(),
		onChangeWorkspaceRole: jest.fn(),
		onToggleTracking: jest.fn(),
		onRequestRemove: jest.fn(),
		onRequestDeactivate: jest.fn(),
		onRename: jest.fn(),
		onSaveRates: jest.fn()
	};
}

function renderRow(row: MemberRowModel, assignableRoles: WorkspaceRole[] = [], actions = actionsOf()) {
	render(
		<ul>
			<MemberRow row={row} assignableRoles={assignableRoles} formatJoined={() => ''} actions={actions} />
		</ul>
	);
	return actions;
}

function itemNames(): Array<string | null> {
	return screen.getAllByRole('menuitem').map((item) => item.textContent);
}

describe('the role menu of a member', () => {
	it('keeps the two team roles alone, without a heading, for a viewer who assigns no workspace role', () => {
		renderRow(rowOf());

		expect(screen.queryAllByTestId('menu-label')).toHaveLength(0);
		expect(screen.queryByRole('group', { name: 'settings.members.ROLE_GROUP_WORKSPACE' })).toBeNull();
		expect(itemNames()).toEqual(
			expect.arrayContaining([
				'settings.members.ROLE_MANAGERsettings.members.ROLE_MANAGER_HINT',
				'settings.members.ROLE_MEMBERsettings.members.ROLE_MEMBER_HINT'
			])
		);
	});

	it('lists under their own heading the workspace roles the viewer may give, and marks the current one', () => {
		renderRow(rowOf({ canChangeWorkspaceRole: true }), [ADMIN, EMPLOYEE, SUPPORT]);

		const workspaceGroup = screen.getByRole('group', { name: 'settings.members.ROLE_GROUP_WORKSPACE' });
		const roles = within(workspaceGroup).getAllByRole('menuitem');
		expect(roles.map((role) => role.textContent)).toEqual([
			'settings.members.WORKSPACE_ROLE_ADMIN',
			'settings.members.WORKSPACE_ROLE_EMPLOYEE',
			'Support desk'
		]);
		expect(within(roles[1]).getByTestId('selected')).toBeTruthy();
		expect(within(roles[0]).queryByTestId('selected')).toBeNull();
		expect(screen.getByRole('group', { name: 'settings.members.ROLE_GROUP_TEAM' })).toBeTruthy();
	});

	it('gives the role picked, and nothing when it is the one the member has', () => {
		const actions = renderRow(rowOf({ canChangeWorkspaceRole: true }), [ADMIN, EMPLOYEE]);
		const workspaceGroup = screen.getByRole('group', { name: 'settings.members.ROLE_GROUP_WORKSPACE' });

		fireEvent.click(within(workspaceGroup).getByText('settings.members.WORKSPACE_ROLE_EMPLOYEE'));
		expect(actions.onChangeWorkspaceRole).not.toHaveBeenCalled();

		fireEvent.click(within(workspaceGroup).getByText('settings.members.WORKSPACE_ROLE_ADMIN'));
		expect(actions.onChangeWorkspaceRole).toHaveBeenCalledWith('row-ana', 'role-admin');
	});

	it('shows the workspace roles alone on a member whose team role the viewer cannot change', () => {
		renderRow(rowOf({ canChangeRole: false, canChangeWorkspaceRole: true }), [ADMIN, EMPLOYEE]);

		expect(screen.queryByRole('group', { name: 'settings.members.ROLE_GROUP_TEAM' })).toBeNull();
		expect(screen.getByRole('group', { name: 'settings.members.ROLE_GROUP_WORKSPACE' })).toBeTruthy();
	});
});

describe('the actions of a member', () => {
	it('offers Deactivate only on a member the viewer may deactivate', () => {
		renderRow(rowOf());

		expect(itemNames()).not.toContain('settings.members.DEACTIVATE');
		expect(itemNames()).toContain('settings.members.REMOVE');
	});

	it('asks for the confirmation of the member whose Deactivate is picked', () => {
		const row = rowOf({ canDeactivate: true });
		const actions = renderRow(row);

		fireEvent.click(screen.getByRole('menuitem', { name: 'settings.members.DEACTIVATE' }));

		expect(actions.onRequestDeactivate).toHaveBeenCalledWith(row);
		expect(actions.onRequestRemove).not.toHaveBeenCalled();
	});
});

describe('the mark of a workspace admin', () => {
	it('marks an admin and a super admin', () => {
		renderRow(rowOf({ workspaceRoleName: 'ADMIN' }));
		renderRow(rowOf({ id: 'row-cy', workspaceRoleName: 'SUPER_ADMIN' }));

		expect(screen.getByText('settings.members.WORKSPACE_ROLE_ADMIN')).toBeTruthy();
		expect(screen.getByText('settings.members.WORKSPACE_ROLE_SUPER_ADMIN')).toBeTruthy();
	});

	it('leaves a member, a workspace manager and an unread role unmarked', () => {
		for (const workspaceRoleName of ['EMPLOYEE', 'MANAGER', null]) {
			const view = render(
				<ul>
					<MemberRow
						row={rowOf({ workspaceRoleName })}
						assignableRoles={[]}
						formatJoined={() => ''}
						actions={actionsOf()}
					/>
				</ul>
			);

			expect(view.container.querySelector('.chip-3d')).toBeNull();
			view.unmount();
		}
	});
});
