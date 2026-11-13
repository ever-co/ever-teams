/** @jest-environment jsdom */

import React from 'react';
import { render } from '@testing-library/react';
import { getDefaultStore } from 'jotai';

jest.mock('@/core/hooks/tasks/use-task-priorities-value', () => ({ useTaskPrioritiesValue: () => ({}) }));
jest.mock('@/core/hooks/tasks/use-task-sizes-value', () => ({ useTaskSizesValue: () => ({}) }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({}) }));
jest.mock('@/core/stores', () => ({ activeTeamState: 'active-team', activeTeamTaskState: 'active-task' }));
jest.mock('@/core/stores/timer/team-timer-status', () => ({ teamTimerStatusState: 'team-timer-status' }));

import { answeredKeysAtom } from '@/core/stores/common/shortcuts';
import { KanbanSelectionProvider, type KanbanSelection } from './kanban-board-context';

const selection: KanbanSelection = {
	selectedIds: new Set<string>(),
	toggleSelected: jest.fn(),
	bindings: new Map(),
	openPicker: jest.fn()
};

function answeredKeys(): readonly string[] {
	return getDefaultStore().get(answeredKeysAtom);
}

describe('KanbanSelectionProvider', () => {
	it('tells the shortcuts sheet the keys a focused card answers, only on a board that has a selection', () => {
		const { rerender } = render(<KanbanSelectionProvider selection={selection}>{null}</KanbanSelectionProvider>);
		expect(answeredKeys()).toEqual([
			'listSelect',
			'taskStatus',
			'taskPriority',
			'taskLabels',
			'taskDueDate',
			'taskProject',
			'taskAssignee'
		]);

		rerender(<KanbanSelectionProvider selection={null}>{null}</KanbanSelectionProvider>);
		expect(answeredKeys()).toEqual([]);
	});
});
