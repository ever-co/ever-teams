/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import type { KanbanLane } from '@/core/lib/utils/kanban-board';
import { useBoardSelection } from './use-board-selection';

const lane = (statusId: string, ids: string[]) =>
	({ status: { id: statusId }, tasks: ids.map((id) => ({ id })) }) as unknown as KanbanLane;

describe('the selection of a board', () => {
	it('toggles cards, selects a range in a lane with Shift, and clears', () => {
		const lanes = [lane('open', ['a', 'b', 'c']), lane('done', ['d'])];
		const { result } = renderHook(() => useBoardSelection(lanes));
		act(() => result.current.toggleSelected('a', false));
		act(() => result.current.toggleSelected('c', true));
		expect([...result.current.selectedIds]).toEqual(['a', 'b', 'c']);
		// Shift across lanes: that card alone.
		act(() => result.current.toggleSelected('d', true));
		expect(result.current.selectedIds.has('d')).toBe(true);
		act(() => result.current.toggleSelected('b', false));
		expect(result.current.selectedIds.has('b')).toBe(false);
		act(() => result.current.clearSelection());
		expect(result.current.selectedIds.size).toBe(0);
	});

	it('counts only the cards still on the board, and takes back the ones an archive left', () => {
		let lanes = [lane('open', ['a', 'b'])];
		const { result, rerender } = renderHook(() => useBoardSelection(lanes));
		act(() => result.current.setManySelected(['a', 'b'], true));
		lanes = [lane('open', ['a'])];
		rerender();
		expect([...result.current.selectedIds]).toEqual(['a']);
		act(() => result.current.setManySelected(['a'], false));
		expect(result.current.selectedIds.size).toBe(0);
	});
});

describe('the selection of a board, once a card leaves it', () => {
	it('forgets the card for good: clearing the filter does not select it again', () => {
		let lanes = [lane('open', ['a', 'b'])];
		const { result, rerender } = renderHook(() => useBoardSelection(lanes));
		act(() => result.current.setManySelected(['a', 'b'], true));
		lanes = [lane('open', ['a'])];
		rerender();
		lanes = [lane('open', ['a', 'b'])];
		rerender();
		expect([...result.current.selectedIds]).toEqual(['a']);
	});

	it("puts an archive's leftovers back only over the selection it cleared", () => {
		const lanes = [lane('open', ['a', 'b', 'c'])];
		const { result } = renderHook(() => useBoardSelection(lanes));
		act(() => result.current.clearSelection());
		const restore = result.current.restoreLater();
		act(() => restore(['a']));
		expect([...result.current.selectedIds]).toEqual(['a']);

		act(() => result.current.clearSelection());
		const late = result.current.restoreLater();
		// The person selects another card before the answer comes.
		act(() => result.current.toggleSelected('c', false));
		act(() => late(['b']));
		expect([...result.current.selectedIds]).toEqual(['c']);
	});

	it('puts back only the leftovers still on the board: one a filter took off stays out once it is cleared', () => {
		let lanes = [lane('open', ['a', 'b'])];
		const { result, rerender } = renderHook(() => useBoardSelection(lanes));
		act(() => result.current.clearSelection());
		const restore = result.current.restoreLater();
		lanes = [lane('open', ['a'])];
		rerender();
		act(() => restore(['a', 'b']));
		lanes = [lane('open', ['a', 'b'])];
		rerender();
		expect([...result.current.selectedIds]).toEqual(['a']);
	});
});
