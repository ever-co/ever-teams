/** @jest-environment jsdom */

/**
 * The Kanban board header offers its invite (+) button only to those the API lets invite into the active team; the
 * rest of the header stays for everyone.
 */
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';

const mockUser = { id: 'user-1', isEmailVerified: true, employee: { id: 'employee-1', userId: 'user-1' } };
const mockKanban = {
	data: { Open: [] },
	setSearchTasks: jest.fn(),
	searchTasks: '',
	isLoading: false,
	isError: false,
	refetchTaskStatuses: jest.fn(),
	setPriority: jest.fn(),
	setSizes: jest.fn(),
	setLabels: jest.fn(),
	setEpics: jest.fn(),
	setIssues: jest.fn(),
	epics: [],
	issues: { value: '' },
	columns: [],
	taskStatuses: [],
	updateKanbanBoard: jest.fn(),
	updateTaskStatus: jest.fn(),
	isColumnCollapse: jest.fn(),
	reorderStatus: jest.fn(),
	addNewTask: jest.fn(),
	toggleColumn: jest.fn()
};

type TChildren = { children?: ReactNode };
type TPageLayoutProps = TChildren & { mainHeaderSlot?: ReactNode };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => {
		if (key === 'pages.home.BREADCRUMB') {
			return '"Home"';
		}
		return key;
	}
}));
jest.mock('next/navigation', () => ({
	useParams: () => ({ locale: 'en' }),
	useSearchParams: () => ({ get: () => null })
}));
jest.mock('@/assets/svg', () => ({
	AddIcon: () => <svg data-testid="invite-icon" />,
	PeoplesIcon: () => null
}));
jest.mock('@/core/components/layouts/app/authenticator', () => ({
	withAuthentication: (Component: unknown) => Component
}));
jest.mock('@/core/components', () => ({
	Container: ({ children }: TChildren) => <div>{children}</div>
}));
jest.mock('@/core/components/layouts/default-layout', () => ({
	PageLayout: ({ children, mainHeaderSlot }: TPageLayoutProps) => (
		<main>
			{mainHeaderSlot}
			{children}
		</main>
	)
}));
jest.mock('@/core/hooks', () => ({
	useModal: () => ({ isOpen: false, openModal: jest.fn(), closeModal: jest.fn() }),
	useStatusValue: () => ({ items: [] })
}));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => ({ myPermissions: [] })
}));
jest.mock('@/core/hooks/tasks/use-kanban', () => ({ useKanban: () => mockKanban }));
jest.mock('@/core/hooks/bootstrap/use-feature-data', () => ({ useTeamDailyPlansOwner: jest.fn() }));
jest.mock('@/core/components/common/separator', () => ({ __esModule: true, default: () => null }));
jest.mock('@/core/components/common/header-tabs', () => ({ __esModule: true, default: () => null }));
jest.mock('@/core/components/tasks/task-issue', () => ({ taskIssues: {} }));
jest.mock('@/core/components/duplicated-components/breadcrumb', () => ({ Breadcrumb: () => null }));
jest.mock('@/core/components/common/skeleton/kanban-view-skeleton', () => ({ KanbanViewSkeleton: () => null }));
jest.mock('@/core/components/common/empty-state', () => ({ AnimatedEmptyState: () => null }));
jest.mock('@/core/components/common/skeleton/modal-skeleton', () => ({ ModalSkeleton: () => null }));
jest.mock('@/core/components/layouts/skeletons/kanban-page-skeleton', () => ({ KanbanPageSkeleton: () => null }));
jest.mock('@/core/components/optimized-components', () => ({
	LazyEpicPropertiesDropdown: () => null,
	LazyKanbanView: () => null,
	LazyStatusDropdown: () => null,
	LazyTaskLabelsDropdown: () => null,
	LazyTaskPropertiesDropdown: () => null,
	LazyTaskSizesDropdown: () => null
}));
jest.mock('@/core/components/optimized-components/kanban', () => ({
	LazyImageComponent: () => null,
	LazyInviteFormModal: () => null,
	LazyKanbanSearch: () => null
}));

import KanbanPage from './page';

function renderKanban(isManager: boolean) {
	const user = { id: 'user-1', firstName: 'User', imageUrl: '' };
	const membership = {
		id: 'membership-1',
		employeeId: 'employee-1',
		employee: { id: 'employee-1', userId: 'user-1', user },
		isManager
	};
	const activeTeam = { id: TEAM_ID, name: 'Active team', members: [membership] };
	const store = createStore();
	store.set(organizationTeamsState, [activeTeam] as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, TEAM_ID);
	render(
		<Provider store={store}>
			<KanbanPage />
		</Provider>
	);
}

describe('Kanban page header', () => {
	it('does not offer the invite button to a plain member of the active team', () => {
		renderKanban(false);

		expect(screen.queryByTestId('invite-icon')).toBeNull();
		expect(screen.getByText('common.FILTER_ALL')).toBeTruthy();
	});

	it('offers the invite button to a manager of the active team', () => {
		renderKanban(true);

		expect(screen.getByTestId('invite-icon')).toBeTruthy();
	});
});
