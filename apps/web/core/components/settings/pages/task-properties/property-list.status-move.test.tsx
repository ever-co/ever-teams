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

type TDragRecord = Record<string | symbol, unknown>;
interface TDraggableConfig {
	element: Element;
	getInitialData: () => TDragRecord;
}
interface TDropTargetConfig {
	element: Element;
	getData: (args: { input: { clientX: number; clientY: number }; element: Element }) => TDragRecord;
}
interface TMonitorConfig {
	onDrop: (args: {
		source: { data: TDragRecord };
		location: { current: { dropTargets: { data: TDragRecord }[] } };
	}) => void;
}
const mockDraggables: TDraggableConfig[] = [];
const mockDropTargets: TDropTargetConfig[] = [];
const mockMonitors: TMonitorConfig[] = [];
// jsdom has no native drag events: the rows' drag sources and drop targets are recorded, and a drop is replayed
jest.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
	draggable: (config: TDraggableConfig) => {
		mockDraggables.push(config);
		return () => undefined;
	},
	dropTargetForElements: (config: TDropTargetConfig) => {
		mockDropTargets.push(config);
		return () => undefined;
	},
	monitorForElements: (config: TMonitorConfig) => {
		mockMonitors.push(config);
		return () => undefined;
	}
}));

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
	const rowElementOf = (id: string) => {
		const row = container.querySelector<HTMLElement>(`[data-property-row="${id}"]`);
		if (!row) {
			throw new Error(`No row ${id}`);
		}
		return row;
	};
	const rowOf = (id: string) => within(rowElementOf(id));
	return { onMove, rowOf, rowElementOf };
}

/** Drops `sourceRow` near the `edge` of `targetRow`, as the list's drag and drop monitor receives it. */
async function dropOn(sourceRow: HTMLElement, targetRow: HTMLElement, edge: 'top' | 'bottom') {
	const source = mockDraggables.find((config) => config.element === sourceRow);
	const target = mockDropTargets.find((config) => config.element === targetRow);
	if (!source || !target) {
		throw new Error('The rows are not both in the drag and drop');
	}
	const rect = { x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 32, width: 200, height: 32 };
	targetRow.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
	const clientY = edge === 'top' ? 2 : 30;
	const targetData = target.getData({ input: { clientX: 10, clientY }, element: targetRow });
	const monitor = mockMonitors.at(-1);
	await act(async () =>
		monitor?.onDrop({
			source: { data: source.getInitialData() },
			location: { current: { dropTargets: [{ data: targetData }] } }
		})
	);
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

describe('the statuses list, dragging a status of the team next to a built-in one (#5359)', () => {
	beforeEach(() => {
		mockDraggables.length = 0;
		mockDropTargets.length = 0;
		mockMonitors.length = 0;
	});

	it('drops it below a built-in status, as Move down does, though the built-in one does not drag', async () => {
		const { onMove, rowElementOf } = renderStatuses([
			{ id: 'mine', name: 'mine', order: 0, ...OWN },
			{ id: 'built-in', name: 'blocked', order: 1, ...BUILT_IN }
		]);

		expect(mockDraggables.some((config) => config.element === rowElementOf('built-in'))).toBe(false);
		await dropOn(rowElementOf('mine'), rowElementOf('built-in'), 'bottom');

		expect(onMove).toHaveBeenCalledWith(['built-in', 'mine']);
	});

	it('drops it above a built-in status when the built-in one keeps its order', async () => {
		const { onMove, rowElementOf } = renderStatuses([
			{ id: 'built-in', name: 'blocked', order: 5, ...BUILT_IN },
			{ id: 'mine', name: 'mine', order: 6, ...OWN }
		]);

		await dropOn(rowElementOf('mine'), rowElementOf('built-in'), 'top');

		expect(onMove).toHaveBeenCalledWith(['mine', 'built-in']);
	});

	it('drops nothing where Gauzy could not save it', async () => {
		const { onMove, rowElementOf } = renderStatuses([
			{ id: 'mine-first', name: 'mine-first', order: 0, ...OWN },
			{ id: 'built-in', name: 'blocked', order: 1, ...BUILT_IN },
			{ id: 'mine-second', name: 'mine-second', order: 2, ...OWN }
		]);

		await dropOn(rowElementOf('mine-second'), rowElementOf('built-in'), 'top');

		expect(onMove).not.toHaveBeenCalled();
	});
});
