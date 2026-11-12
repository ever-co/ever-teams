/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { PROJECTS_LIST_HIDDEN_COLUMNS, PROJECTS_TABLE_VIEW_LAST_SORTING } from '@/core/constants/config/constants';
import { PROJECT_COLUMNS } from '@/core/lib/utils/project-list';
import { useProjectsListState } from './use-projects-list-state';

const mockSearchParams = new URLSearchParams('');

jest.mock('next/navigation', () => ({
	useSearchParams: () => mockSearchParams,
	useRouter: () => ({ replace: () => undefined }),
	usePathname: () => '/projects'
}));

function renderList(showsConsumption: boolean) {
	return renderHook((props: { showsConsumption: boolean }) => useProjectsListState(props), {
		initialProps: { showsConsumption }
	});
}

function storeSorting(id: string, desc: boolean) {
	window.localStorage.setItem(PROJECTS_TABLE_VIEW_LAST_SORTING, JSON.stringify([{ id, desc }]));
}

beforeEach(() => {
	window.localStorage.clear();
});

describe('useProjectsListState, columns and orderings read from the budget report', () => {
	it('offers and shows the time spent column to someone who can open the report', () => {
		const { result } = renderList(true);

		expect(result.current.isColumnOffered('timeSpent')).toBe(true);
		expect(result.current.isColumnVisible('timeSpent')).toBe(true);
		expect(result.current.isOrderFieldOffered('timeSpent')).toBe(true);
		expect(result.current.isOrderFieldOffered('budgetUsed')).toBe(true);
	});

	it('keeps them from anyone else, and leaves every other column and ordering as it was', () => {
		const { result } = renderList(false);

		const visibleColumns = PROJECT_COLUMNS.filter((column) => result.current.isColumnVisible(column));
		const otherColumns = PROJECT_COLUMNS.filter((column) => column !== 'timeSpent');
		expect(visibleColumns).toEqual(otherColumns);
		expect(visibleColumns).toContain('budget');
		expect(result.current.isColumnOffered('timeSpent')).toBe(false);
		expect(result.current.isOrderFieldOffered('timeSpent')).toBe(false);
		expect(result.current.isOrderFieldOffered('budgetUsed')).toBe(false);
		expect(result.current.isOrderFieldOffered('name')).toBe(true);
		expect(result.current.isOrderFieldOffered('startDate')).toBe(true);
	});

	it('lets a manager hide the time spent column like any other', () => {
		const { result } = renderList(true);

		act(() => result.current.toggleColumn('timeSpent'));

		expect(result.current.isColumnVisible('timeSpent')).toBe(false);
		expect(window.localStorage.getItem(PROJECTS_LIST_HIDDEN_COLUMNS)).toBe(JSON.stringify(['timeSpent']));
	});

	it('uses an ordering by consumption kept on the device for someone who can open the report', () => {
		storeSorting('budgetUsed', true);

		const { result } = renderList(true);

		expect(result.current.ordering).toEqual({ id: 'budgetUsed', desc: true });
	});

	it('falls back on the name when that ordering was kept by someone else on the device', () => {
		storeSorting('budgetUsed', true);

		const { result } = renderList(false);

		expect(result.current.ordering).toEqual({ id: 'name', desc: true });
		expect(window.localStorage.getItem(PROJECTS_TABLE_VIEW_LAST_SORTING)).toBe(
			JSON.stringify([{ id: 'budgetUsed', desc: true }])
		);
	});

	it('follows the role once it is known, without losing the ordering', () => {
		storeSorting('timeSpent', true);
		const { result, rerender } = renderList(false);
		expect(result.current.ordering.id).toBe('name');

		rerender({ showsConsumption: true });

		expect(result.current.ordering).toEqual({ id: 'timeSpent', desc: true });
		expect(result.current.isColumnVisible('timeSpent')).toBe(true);
	});
});
