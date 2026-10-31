/** @jest-environment jsdom */

/**
 * The versions block of the team settings: every member reads the list, and the create, edit and delete
 * controls follow the rule the API applies to those writes (a manager of the team or an ORG_TASK_SETTING
 * holder); anyone else gets them read-only instead of a 403.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';
const READ_ONLY_HINT = 'pages.settingsTeam.TASK_SETTINGS_READ_ONLY';

const mockUser = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } };
const mockPermissions = { myPermissions: [] as string[], isSuccess: true };
const mockVersions = [{ id: 'version-1', name: 'v1', value: 'v1', organizationTeamId: TEAM_ID as string | null }];

type TButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type TTextProps = { children?: ReactNode; className?: string };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('assets/svg', () => ({ EditPenUnderlineIcon: () => null, TrashIcon: () => null }), { virtual: true });
jest.mock('@/core/components', () => {
	const Text = ({ children, className }: TTextProps) => <span className={className}>{children}</span>;
	Text.Label = Text;
	const Button = ({ children, disabled, onClick }: TButtonProps) => (
		<button disabled={disabled} onClick={onClick}>
			{children}
		</button>
	);
	return { Button, Text };
});
jest.mock('@/core/components/common/spinner', () => ({ Spinner: () => null }));
jest.mock('@/core/hooks', () => ({
	useCallbackRef: (callback: unknown) => ({ current: callback }),
	useRefetchData: () => ({ refetch: jest.fn() })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));
jest.mock('@/core/hooks/tasks/use-task-versions-query', () => ({
	useTaskVersionsQuery: () => ({ loading: false, taskVersions: mockVersions })
}));
jest.mock('@/core/hooks/tasks/use-create-task-version', () => ({
	useCreateTaskVersion: () => ({ createTaskVersion: jest.fn(), createTaskVersionLoading: false })
}));
jest.mock('@/core/hooks/tasks/use-edit-task-version', () => ({
	useEditTaskVersion: () => ({ editTaskVersion: jest.fn(), editTaskVersionLoading: false })
}));
jest.mock('@/core/hooks/tasks/use-delete-task-version', () => ({
	useDeleteTaskVersion: () => ({ deleteTaskVersion: jest.fn() })
}));

import { TaskVersionForm } from './version-form';

function membership(isManager: boolean) {
	return {
		id: 'membership-1',
		employeeId: 'employee-1',
		employee: { id: 'employee-1', userId: 'user-1' },
		isActive: true,
		isArchived: false,
		isManager,
		role: null
	};
}

function renderVersionsAs(isManager: boolean, { formOnly = false }: { formOnly?: boolean } = {}) {
	const store = createStore();
	const activeTeam = { id: TEAM_ID, name: 'Team', members: [membership(isManager)] };
	store.set(organizationTeamsState, [activeTeam] as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, TEAM_ID);
	render(
		<Provider store={store}>
			<TaskVersionForm formOnly={formOnly} />
		</Provider>
	);
}

function createButton() {
	return screen.getByRole('button', { name: 'pages.settingsTeam.CREATE_NEW_VERSION' });
}

/** The edit and delete actions of the version row: every button but the create one. */
function rowButtons() {
	const create = createButton();
	const buttons = screen.getAllByRole('button');
	return buttons.filter((button) => button !== create);
}

/** Hovers the area around a row action: a disabled action lets the pointer through to it. */
function hoverAround(button: HTMLElement) {
	const area = button.parentElement ?? button;
	fireEvent.mouseEnter(area);
}

describe('TaskVersionForm task settings access', () => {
	beforeEach(() => {
		mockPermissions.myPermissions = [];
		mockVersions[0].organizationTeamId = TEAM_ID;
	});

	it('keeps the versions listed but every change read-only for a member who is not a manager', () => {
		renderVersionsAs(false);

		expect(screen.getByText('v1')).toBeTruthy();
		expect(createButton()).toHaveProperty('disabled', true);
		expect(rowButtons()).toHaveLength(2);
		for (const button of rowButtons()) {
			expect(button).toHaveProperty('disabled', true);
		}
	});

	it('explains the read-only delete action of a version with the hint the edit action shows', async () => {
		renderVersionsAs(false);

		const rowActions = rowButtons();
		const deleteAction = rowActions[1];
		hoverAround(deleteAction);

		const hint = await screen.findByText(READ_ONLY_HINT);
		expect(hint).toBeTruthy();
	});

	it('gives a manager of the team the create, edit and delete controls', () => {
		renderVersionsAs(true);

		expect(createButton()).toHaveProperty('disabled', false);
		for (const button of rowButtons()) {
			expect(button).toHaveProperty('disabled', false);
		}
	});

	it('gives an ORG_TASK_SETTING holder the controls without managing the team', () => {
		mockPermissions.myPermissions = ['ORG_TASK_SETTING'];
		renderVersionsAs(false);

		expect(createButton()).toHaveProperty('disabled', false);
		for (const button of rowButtons()) {
			expect(button).toHaveProperty('disabled', false);
		}
	});

	// The permissions allow editing while they load, so a member can open the form (the + of the task details opens
	// it on its own) before the denial arrives: it must then not submit a write Gauzy refuses.
	it('does not let a member who cannot create submit an open form', () => {
		renderVersionsAs(false, { formOnly: true });

		expect(screen.getByRole('button', { name: 'common.CREATE' })).toHaveProperty('disabled', true);
	});

	it('lets a manager of the team submit the open form', () => {
		renderVersionsAs(true, { formOnly: true });

		expect(screen.getByRole('button', { name: 'common.CREATE' })).toHaveProperty('disabled', false);
	});

	it('keeps a version of no team read-only for a manager of the team, who still creates', () => {
		mockVersions[0].organizationTeamId = null;
		renderVersionsAs(true);

		expect(createButton()).toHaveProperty('disabled', false);
		for (const button of rowButtons()) {
			expect(button).toHaveProperty('disabled', true);
		}
	});
});
