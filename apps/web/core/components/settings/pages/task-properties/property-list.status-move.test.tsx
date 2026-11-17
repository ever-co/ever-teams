/** @jest-environment jsdom */
import type { ReactNode } from 'react';
import { act, fireEvent, render, within } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The menu's primitives open in a portal on a pointer gesture jsdom does not have: every item is drawn at once here.
jest.mock('@/core/components/common/dropdown-menu', () => {
	const Pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
	return {
		DropdownMenu: Pass,
		DropdownMenuTrigger: Pass,
		DropdownMenuContent: Pass,
		DropdownMenuLabel: Pass,
		DropdownMenuSeparator: () => <hr />,
		DropdownMenuItem: ({
			children,
			onClick,
			disabled
		}: {
			children?: ReactNode;
			onClick?: () => void;
			disabled?: boolean;
		}) => (
			<button type="button" role="menuitem" disabled={disabled} onClick={onClick}>
				{children}
			</button>
		)
	};
});
jest.mock('@/core/hooks/tasks/use-task-settings-access', () => ({
	useTaskSettingsAccess: () => ({
		canCreate: true,
		canWriteRow: () => true,
		canWriteRows: () => true,
		readOnlyHint: 'read only'
	})
}));
jest.mock('@/core/components/tasks/task-property-icon', () => ({
	TaskPropertyIcon: () => null,
	TaskPropertyPlaceholderIcon: () => null
}));
jest.mock('./property-editor-row', () => ({ PropertyEditorRow: () => null }));
jest.mock('./property-delete-dialog', () => ({ PropertyDeleteDialog: () => null }));

import {
	isStatusOrderSaved,
	OrderedPropertySource,
	PropertyListItem,
	statusItemsOf
} from '@/core/lib/utils/settings-task-properties';
import { PropertyList, usePropertyListController } from './property-list';

const MOVE_UP = 'settings.taskProperties.MOVE_UP';
const MOVE_DOWN = 'settings.taskProperties.MOVE_DOWN';
const BUILT_IN_MOVE = 'settings.taskProperties.BUILT_IN_MOVE';
const DRAG = 'settings.taskProperties.DRAG';

const BUILT_IN = { isSystem: true, organizationTeamId: null };
const OWN = { isSystem: false, organizationTeamId: 'team-1' };

function StatusList({
	items,
	onMove
}: Readonly<{ items: PropertyListItem[]; onMove: (ids: string[]) => Promise<void> }>) {
	const controller = usePropertyListController();
	const model = {
		items,
		isLoading: false,
		isError: false,
		retry: jest.fn(),
		create: jest.fn(),
		update: jest.fn()
	};
	return (
		<PropertyList
			kind="status"
			model={model}
			controller={controller}
			skeletonRows={3}
			onMove={onMove}
			canMove={(orderedIds) => isStatusOrderSaved(items, orderedIds)}
		/>
	);
}

function renderStatuses(statuses: OrderedPropertySource[]) {
	const onMove = jest.fn().mockResolvedValue(undefined);
	const { container } = render(<StatusList items={statusItemsOf(statuses)} onMove={onMove} />);
	const rowOf = (id: string) => {
		const row = container.querySelector<HTMLElement>(`[data-property-row="${id}"]`);
		if (!row) {
			throw new Error(`No row ${id}`);
		}
		return within(row);
	};
	return { onMove, rowOf };
}

describe('the statuses list, moving a status (#5359)', () => {
	it('offers no move on a team that still uses the built-in statuses, and says why', () => {
		const { rowOf } = renderStatuses([
			{ id: 'open', name: 'open', order: 0, ...BUILT_IN },
			{ id: 'blocked', name: 'blocked', order: 1, ...BUILT_IN },
			{ id: 'done', name: 'done', order: 2, ...BUILT_IN }
		]);

		for (const id of ['open', 'blocked', 'done']) {
			const row = rowOf(id);
			expect(row.queryByRole('menuitem', { name: MOVE_UP })).toBeNull();
			expect(row.queryByRole('menuitem', { name: MOVE_DOWN })).toBeNull();
			expect(row.getByText(BUILT_IN_MOVE)).toBeTruthy();
			expect(row.queryByTitle(DRAG)).toBeNull();
		}
	});

	it('offers a status of the team only the moves Gauzy can save next to a built-in one', async () => {
		const { rowOf, onMove } = renderStatuses([
			{ id: 'mine-first', name: 'mine-first', order: 0, ...OWN },
			{ id: 'built-in', name: 'blocked', order: 1, ...BUILT_IN },
			{ id: 'mine-second', name: 'mine-second', order: 2, ...OWN }
		]);

		// Above the built-in status at 1 there is room for one status of the team only
		const second = rowOf('mine-second');
		expect((second.getByRole('menuitem', { name: MOVE_UP }) as HTMLButtonElement).disabled).toBe(true);
		expect(rowOf('built-in').queryByRole('menuitem', { name: MOVE_UP })).toBeNull();

		const first = rowOf('mine-first');
		const moveDown = first.getByRole('menuitem', { name: MOVE_DOWN }) as HTMLButtonElement;
		expect(moveDown.disabled).toBe(false);
		await act(async () => fireEvent.click(moveDown));

		expect(onMove).toHaveBeenCalledWith(['built-in', 'mine-first', 'mine-second']);
	});

	it('still offers every move between the statuses of a team that has its own', async () => {
		const { rowOf, onMove } = renderStatuses([
			{ id: 'todo', name: 'todo', order: 0, ...OWN },
			{ id: 'doing', name: 'doing', order: 1, ...OWN },
			{ id: 'shipped', name: 'shipped', order: 2, ...OWN }
		]);

		const doing = rowOf('doing');
		expect((doing.getByRole('menuitem', { name: MOVE_DOWN }) as HTMLButtonElement).disabled).toBe(false);
		expect(doing.queryByText(BUILT_IN_MOVE)).toBeNull();
		await act(async () => fireEvent.click(doing.getByRole('menuitem', { name: MOVE_UP })));

		expect(onMove).toHaveBeenCalledWith(['doing', 'todo', 'shipped']);
	});
});
