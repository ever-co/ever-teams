/**
 * The priority picker that the task details open with a create button. Creating a priority is a task settings write
 * the API accepts only from a manager of the team or a holder of ORG_TASK_SETTING, so the button shows read-only, with
 * a hint, to everyone else. Picking a priority is not concerned.
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TaskPriorityPopup from './task-priority-popup';

let mockStores: Record<string, unknown> = {};

jest.mock('../models', () => ({
	useStores: () => mockStores
}));

jest.mock('../i18n', () => ({
	translate: (key: string) => key
}));

jest.mock('../services/client/requests/roles', () => ({
	getMyRolePermissionsRequest: jest.fn(() => new Promise(() => undefined))
}));

jest.mock('../services/hooks/features/use-task-priority', () => ({
	useTaskPriority: () => ({ allTaskPriorities: [], createPriority: jest.fn(), updatePriority: jest.fn() })
}));

// The blur behind the popup is a native view and plays no part in what the popup offers
jest.mock('expo-blur', () => ({
	BlurView: () => null
}));

// The icons load their font after the render; their glyph name is all the popup needs
jest.mock('@expo/vector-icons', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText } = jest.requireActual('react-native');
	const mockIcon = ({ name }: { name: string }) => mockReact.createElement(MockText, null, name);
	return { AntDesign: mockIcon, Feather: mockIcon, Ionicons: mockIcon };
});

jest.mock('../screens/authenticated/task-priorities-screen/components/task-priority-form', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText } = jest.requireActual('react-native');
	return {
		__esModule: true,
		default: () => mockReact.createElement(MockText, null, 'priority form')
	};
});

const TEAM = 'team-1';
const CREATE_LABEL = 'settingScreen.priorityScreen.createNewPriorityText';
const READ_ONLY_HINT = 'settingScreen.teamSection.taskSettingsReadOnly';
const PRIORITY_FORM = 'priority form';

function givenOwnMembership(overrides: Record<string, unknown> = {}) {
	const membership = { employeeId: 'employee-1', employee: { userId: 'user-1' }, isManager: false, ...overrides };
	const activeTeam = { id: TEAM, members: [membership] };
	const user = { id: 'user-1', roleId: 'role-1', employee: { id: 'employee-1' } };
	mockStores = {
		authenticationStore: { authToken: 'token', tenantId: 'tenant-1', user, employeeId: 'employee-1' },
		teamStore: { teams: { items: [activeTeam], total: 1 }, activeTeam, activeTeamId: TEAM }
	};
}

/** Renders the popup once the role's permissions are known, as the task details open it. */
async function renderPopup(permissions: string[], canCreatePriority = true) {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	const rows = permissions.map((permission) => ({ id: permission, roleId: 'role-1', permission, enabled: true }));
	client.setQueryData(['rolePermissions', 'me', 'tenant-1', 'user-1', 'role-1'], rows);

	await render(
		<QueryClientProvider client={client}>
			<TaskPriorityPopup
				visible={true}
				onDismiss={jest.fn()}
				priorityName=""
				setSelectedPriority={jest.fn()}
				canCreatePriority={canCreatePriority}
			/>
		</QueryClientProvider>
	);
}

describe('<TaskPriorityPopup> create button', () => {
	it('is read-only, with the hint, for a member who neither manages the team nor holds the permission', async () => {
		givenOwnMembership();

		await renderPopup([]);
		await fireEvent.press(screen.getByText(CREATE_LABEL));

		expect(screen.getByText(READ_ONLY_HINT)).toBeTruthy();
		expect(screen.queryByText(PRIORITY_FORM)).toBeNull();
	});

	it('opens the create form for a manager of the team', async () => {
		givenOwnMembership({ isManager: true });

		await renderPopup([]);
		expect(screen.queryByText(READ_ONLY_HINT)).toBeNull();
		await fireEvent.press(screen.getByText(CREATE_LABEL));

		expect(screen.getByText(PRIORITY_FORM)).toBeTruthy();
	});

	it('opens the create form for a holder of ORG_TASK_SETTING who does not manage the team', async () => {
		givenOwnMembership();

		await renderPopup(['ORG_TASK_SETTING']);
		await fireEvent.press(screen.getByText(CREATE_LABEL));

		expect(screen.getByText(PRIORITY_FORM)).toBeTruthy();
	});

	it('stays hidden, without the hint, when the picker is opened without creation', async () => {
		givenOwnMembership();

		await renderPopup([], false);

		expect(screen.queryByText(CREATE_LABEL)).toBeNull();
		expect(screen.queryByText(READ_ONLY_HINT)).toBeNull();
	});
});
