/** @jest-environment jsdom */

/**
 * The default issue type of the team settings: making another type the default also clears the mark on every other
 * type, so its trigger follows the rule the API applies to those writes (a manager of every row's team or an
 * ORG_TASK_SETTING holder). Anyone else gets it disabled, with the read-only hint, instead of a 403.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';
const READ_ONLY_HINT = 'pages.settingsTeam.TASK_SETTINGS_READ_ONLY';

const mockUser = { id: 'user-1', tenantId: 'tenant-1', employee: { id: 'employee-1', organizationId: 'org-1' } };
const mockPermissions = { myPermissions: [] as string[], isSuccess: true, isLoaded: true };
const mockIssueTypes = [
	{ id: 'bug', name: 'Bug', isDefault: true, organizationTeamId: TEAM_ID, fullIconUrl: '/bug.svg' },
	{ id: 'story', name: 'Story', isDefault: false, organizationTeamId: TEAM_ID, fullIconUrl: '/story.svg' }
];

type TTextProps = { children?: ReactNode; className?: string };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
jest.mock('assets/svg', () => ({ EditPenUnderlineIcon: () => null }), { virtual: true });
jest.mock('@/core/components', () => {
	const Text = ({ children, className }: TTextProps) => <span className={className}>{children}</span>;
	Text.Label = Text;
	return { SpinnerLoader: () => null, Text };
});
jest.mock('../settings/list-card', () => ({ StatusesListCard: () => null }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));
jest.mock('@/core/hooks/tasks/use-issue-types-query', () => ({
	useIssueTypesQuery: () => ({ issueTypes: mockIssueTypes })
}));
jest.mock('@/core/hooks/tasks/use-edit-issue-type', () => ({
	useEditIssueType: () => ({ editIssueType: jest.fn(), editIssueTypeLoading: false })
}));

import { DefaultIssueTypeForm } from './default-issue-type-form';

function renderAs(isManager: boolean) {
	const store = createStore();
	const membership = {
		id: 'membership-1',
		employeeId: 'employee-1',
		employee: { id: 'employee-1', userId: 'user-1' },
		isActive: true,
		isArchived: false,
		isManager,
		role: null
	};
	const activeTeam = { id: TEAM_ID, name: 'Team', members: [membership] };
	store.set(organizationTeamsState, [activeTeam] as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, TEAM_ID);
	render(
		<Provider store={store}>
			<DefaultIssueTypeForm />
		</Provider>
	);
}

/** The trigger that opens the list of types to make the default: the only button of the form. */
function defaultTypeTrigger() {
	return screen.getByRole('button');
}

describe('DefaultIssueTypeForm task settings access', () => {
	beforeEach(() => {
		mockPermissions.myPermissions = [];
	});

	it('shows the default type to a member who is not a manager, with its trigger disabled and the read-only hint', async () => {
		renderAs(false);

		expect(screen.getByText('Bug')).toBeTruthy();
		const trigger = defaultTypeTrigger();
		expect(trigger).toHaveProperty('disabled', true);

		// A disabled trigger lets the pointer through to the tooltip around it
		fireEvent.mouseEnter(trigger.parentElement ?? trigger);
		expect(await screen.findByText(READ_ONLY_HINT)).toBeTruthy();
	});

	it('gives a manager of the team the trigger', () => {
		renderAs(true);

		expect(defaultTypeTrigger()).toHaveProperty('disabled', false);
	});

	it('gives an ORG_TASK_SETTING holder the trigger without managing the team', () => {
		mockPermissions.myPermissions = ['ORG_TASK_SETTING'];
		renderAs(false);

		expect(defaultTypeTrigger()).toHaveProperty('disabled', false);
	});
});
