/** @jest-environment jsdom */

/**
 * The kanban column controls that save on the task status follow the rule the API applies to status writes (a
 * manager of the team or an ORG_TASK_SETTING holder): Edit status, and collapse or expand, which store the collapsed
 * state on the status for the whole team. Anyone else gets them read-only instead of a 403, and still creates tasks.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';

import { activeTeamIdState, organizationTeamsState } from '@/core/stores';
import type { TOrganizationTeam } from '@/core/types/schemas';

const TEAM_ID = 'team-1';
const COLUMN_TITLE = 'open';
const READ_ONLY_HINT = 'pages.settingsTeam.TASK_SETTINGS_READ_ONLY';

const mockUser = { id: 'user-1', employee: { id: 'employee-1' } };
const mockPermissions = { myPermissions: [] as string[], isSuccess: true };

type TChildrenProps = { children?: ReactNode };
type TDragRenderProps = { children: (provided: object, snapshot: object) => ReactNode };

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('next/image', () => ({ __esModule: true, default: () => null }));
// The component imports 'assets/svg' through the tsconfig baseUrl: the alias resolves to the same file
jest.mock('@/assets/svg', () => ({
	...jest.requireActual('@/assets/svg'),
	ChevronLeftIcon: () => <span>chevron</span>
}));
jest.mock('@hello-pangea/dnd', () => {
	const provided = {
		innerRef: () => undefined,
		draggableProps: { style: {} },
		dragHandleProps: {},
		droppableProps: {},
		placeholder: null
	};
	const snapshot = { isDragging: false, isDraggingOver: false, draggingFromThisWith: null };
	const WithDragState = ({ children }: TDragRenderProps) => <>{children(provided, snapshot)}</>;
	return { Draggable: WithDragState, Droppable: WithDragState };
});
jest.mock('@/core/components/common/popover', () => {
	const Wrapper = ({ children }: TChildrenProps) => <div>{children}</div>;
	return { Popover: Wrapper, PopoverTrigger: Wrapper, PopoverContent: Wrapper };
});
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: ({ children }: TChildrenProps) => <button>{children}</button>
}));
jest.mock('@/core/components/common/scroll-area', () => ({
	ScrollArea: ({ children }: TChildrenProps) => <div>{children}</div>
}));
jest.mock('@/core/components/common/modal', () => ({
	Modal: ({ children }: TChildrenProps) => <div>{children}</div>
}));
jest.mock('@/core/components/common/skeleton/modal-skeleton', () => ({ ModalSkeleton: () => null }));
jest.mock('@/core/components/common/skeleton/kanban-column-loading-skeleton', () => ({
	KanbanColumnLoadingSkeleton: () => null
}));
jest.mock('@/core/components/optimized-components/tasks', () => ({
	LazyCreateTaskModal: () => <div>create task form</div>,
	LazyEditStatusModal: () => <div>edit status form</div>
}));
jest.mock('./kanban-card', () => ({ __esModule: true, default: () => null }));
jest.mock('@/core/hooks', () => jest.requireActual('@/core/hooks/common/use-modal'));
jest.mock('@/core/hooks/queries/user-user.query', () => ({
	useUserQuery: () => ({ data: mockUser })
}));
jest.mock('@/core/hooks/roles/use-my-role-permissions-query', () => ({
	useMyRolePermissionsQuery: () => mockPermissions
}));

import KanbanDraggable, { EmptyKanbanDroppable } from './kanban';

const column = { id: 'status-1', name: COLUMN_TITLE, icon: '', color: '#ffffff', organizationTeamId: TEAM_ID };

/** The user's own, active membership of the team. */
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

function storeOfMember(isManager: boolean) {
	const store = createStore();
	const activeTeam = { id: TEAM_ID, name: 'Team', members: [membership(isManager)] };
	store.set(organizationTeamsState, [activeTeam] as unknown as TOrganizationTeam[]);
	store.set(activeTeamIdState, TEAM_ID);
	return store;
}

/** A collapsed column, which renders on the next animation frame. */
async function renderCollapsedColumnAs(isManager: boolean, toggleColumn: jest.Mock) {
	const store = storeOfMember(isManager);
	render(
		<Provider store={store}>
			<EmptyKanbanDroppable
				index={0}
				title={COLUMN_TITLE}
				status={column}
				setColumn={jest.fn()}
				items={[]}
				backgroundColor="#ffffff"
				toggleColumn={toggleColumn}
			/>
		</Provider>
	);
	await screen.findByText('common.EXPAND_COLUMN');
}

function renderOpenColumnAs(isManager: boolean, toggleColumn: jest.Mock) {
	const store = storeOfMember(isManager);
	render(
		<Provider store={store}>
			<KanbanDraggable
				index={0}
				title={COLUMN_TITLE}
				status={column}
				setColumn={jest.fn()}
				icon=""
				isLoading={false}
				backgroundColor="#ffffff"
				items={[]}
				addNewTask={jest.fn()}
				toggleColumn={toggleColumn}
			/>
		</Provider>
	);
}

function chevronButton() {
	return screen.getByRole('button', { name: 'chevron' });
}

function clickText(text: string) {
	const element = screen.getByText(text);
	fireEvent.click(element);
}

describe('Kanban column controls task settings access', () => {
	beforeEach(() => {
		mockPermissions.myPermissions = [];
	});

	it('shows a member who is not a manager the expand controls and Edit status of a collapsed column read-only', async () => {
		const toggleColumn = jest.fn();
		await renderCollapsedColumnAs(false, toggleColumn);

		const expandButton = chevronButton();
		const expandEntry = screen.getByText('common.EXPAND_COLUMN');
		const editEntry = screen.getByText('common.EDIT_STATUS');
		expect(expandButton).toHaveProperty('disabled', true);
		expect(expandButton.getAttribute('title')).toBe(READ_ONLY_HINT);
		expect(expandEntry.getAttribute('aria-disabled')).toBe('true');
		expect(editEntry.getAttribute('aria-disabled')).toBe('true');

		fireEvent.click(expandButton);
		fireEvent.click(expandEntry);
		fireEvent.click(editEntry);
		expect(toggleColumn).not.toHaveBeenCalled();
		expect(screen.queryByText('edit status form')).toBeNull();
	});

	it('opens only the create task form from a collapsed column for a member who is not a manager', async () => {
		await renderCollapsedColumnAs(false, jest.fn());

		clickText('hotkeys.CREATE_TASK');

		expect(screen.getByText('create task form')).toBeTruthy();
		expect(screen.queryByText('edit status form')).toBeNull();
	});

	it('lets a manager of the team expand a collapsed column and edit its status', async () => {
		const toggleColumn = jest.fn();
		await renderCollapsedColumnAs(true, toggleColumn);

		const expandButton = chevronButton();
		expect(expandButton).toHaveProperty('disabled', false);
		expect(expandButton.hasAttribute('title')).toBe(false);

		fireEvent.click(expandButton);
		clickText('common.EXPAND_COLUMN');
		clickText('common.EDIT_STATUS');
		expect(toggleColumn).toHaveBeenCalledTimes(2);
		expect(toggleColumn).toHaveBeenCalledWith(COLUMN_TITLE, false);
		expect(screen.getByText('edit status form')).toBeTruthy();
	});

	it('shows a member who is not a manager the collapse controls and Edit status of an open column read-only', () => {
		const toggleColumn = jest.fn();
		renderOpenColumnAs(false, toggleColumn);

		const collapseButton = chevronButton();
		const collapseEntry = screen.getByText('common.COLLAPSE_COLUMN');
		const editEntry = screen.getByText('common.EDIT_STATUS');
		expect(collapseButton).toHaveProperty('disabled', true);
		expect(collapseButton.getAttribute('title')).toBe(READ_ONLY_HINT);
		expect(collapseEntry.getAttribute('aria-disabled')).toBe('true');
		expect(editEntry.getAttribute('aria-disabled')).toBe('true');

		fireEvent.click(collapseButton);
		fireEvent.click(collapseEntry);
		fireEvent.click(editEntry);
		expect(toggleColumn).not.toHaveBeenCalled();
		expect(screen.queryByText('edit status form')).toBeNull();
	});

	it('gives an ORG_TASK_SETTING holder the collapse controls and Edit status without managing the team', () => {
		mockPermissions.myPermissions = ['ORG_TASK_SETTING'];
		const toggleColumn = jest.fn();
		renderOpenColumnAs(false, toggleColumn);

		const collapseButton = chevronButton();
		expect(collapseButton).toHaveProperty('disabled', false);

		fireEvent.click(collapseButton);
		clickText('common.COLLAPSE_COLUMN');
		clickText('common.EDIT_STATUS');
		expect(toggleColumn).toHaveBeenCalledTimes(2);
		expect(toggleColumn).toHaveBeenCalledWith(COLUMN_TITLE, true);
		expect(screen.getByText('edit status form')).toBeTruthy();
	});
});
