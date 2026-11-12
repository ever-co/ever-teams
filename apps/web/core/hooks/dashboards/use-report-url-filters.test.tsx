/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';

const mockRouter = { replace: jest.fn() };
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
	usePathname: () => '/reports/time-and-activity',
	useSearchParams: () => mockSearchParams
}));

import { useReportUrlFilters } from './use-report-url-filters';

const NOT_SCROLLING = { scroll: false };

function linkMovesTo(query: string) {
	mockSearchParams = new URLSearchParams(query);
}

describe('useReportUrlFilters', () => {
	beforeEach(() => {
		mockRouter.replace.mockReset();
		linkMovesTo('');
	});

	it('reads the filters a shared link carries', () => {
		linkMovesTo('clients=acme,none&billable=true&labels=bug');

		const { result } = renderHook(() => useReportUrlFilters());

		expect(result.current.filters).toEqual({ clients: ['acme', 'none'], billable: ['true'], labels: ['bug'] });
	});

	it('writes a picked value into the link, beside what the link already holds', () => {
		linkMovesTo('billable=true');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.setFilter('clients', ['acme', 'none']));

		expect(mockRouter.replace).toHaveBeenCalledWith(
			'/reports/time-and-activity?billable=true&clients=acme%2Cnone',
			NOT_SCROLLING
		);
	});

	it('shows a picked value at once, before the link has changed', () => {
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.setFilter('clients', ['acme']));

		expect(result.current.filters.clients).toEqual(['acme']);
	});

	it('builds the next pick on the one still on its way to the link', () => {
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.setFilter('clients', ['acme']));
		act(() => result.current.setFilter('labels', ['bug']));

		expect(mockRouter.replace).toHaveBeenLastCalledWith(
			'/reports/time-and-activity?clients=acme&labels=bug',
			NOT_SCROLLING
		);
		expect(result.current.filters).toEqual({ clients: ['acme'], billable: [], labels: ['bug'] });
	});

	it('follows the link once it has moved, wherever it went', () => {
		const { result, rerender } = renderHook(() => useReportUrlFilters());
		act(() => result.current.setFilter('clients', ['acme']));

		linkMovesTo('clients=globex');
		rerender();

		expect(result.current.filters.clients).toEqual(['globex']);
	});

	it('does not bring a past pick back when the link returns to where it was', () => {
		const { result, rerender } = renderHook(() => useReportUrlFilters());
		act(() => result.current.setFilter('clients', ['acme']));
		linkMovesTo('clients=acme');
		rerender();

		linkMovesTo('');
		rerender();

		expect(result.current.filters.clients).toEqual([]);
	});

	it('removes one value and keeps the others of the same filter', () => {
		linkMovesTo('labels=bug,urgent');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.removeFilterValue('labels', 'bug'));

		expect(mockRouter.replace).toHaveBeenCalledWith('/reports/time-and-activity?labels=urgent', NOT_SCROLLING);
	});

	it('clears its three filters in one change of the link', () => {
		linkMovesTo('clients=acme&billable=true&labels=bug&date=2026-11-03');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).toHaveBeenCalledTimes(1);
		expect(mockRouter.replace).toHaveBeenCalledWith('/reports/time-and-activity?date=2026-11-03', NOT_SCROLLING);
		expect(result.current.filters).toEqual({ clients: [], billable: [], labels: [] });
	});

	it('leaves the link alone when clearing changes nothing', () => {
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).not.toHaveBeenCalled();
	});

	it('reads the other values a shared link carries', () => {
		linkMovesTo('groupBy=client&clients=acme');

		const { result } = renderHook(() => useReportUrlFilters());

		expect(result.current.params.get('groupBy')).toBe('client');
	});

	it('writes another value beside the filters, and takes it out of the link with null', () => {
		linkMovesTo('clients=acme');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.setParam('groupBy', 'client'));
		expect(mockRouter.replace).toHaveBeenLastCalledWith(
			'/reports/time-and-activity?clients=acme&groupBy=client',
			NOT_SCROLLING
		);
		expect(result.current.params.get('groupBy')).toBe('client');

		act(() => result.current.setParam('groupBy', null));
		expect(mockRouter.replace).toHaveBeenLastCalledWith('/reports/time-and-activity?clients=acme', NOT_SCROLLING);
	});

	it('builds a filter pick on a value still on its way to the link, and the other way round', () => {
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.setParam('groupBy', 'client'));
		act(() => result.current.setFilter('clients', ['acme']));
		act(() => result.current.setParam('groupBy', 'project'));

		expect(mockRouter.replace).toHaveBeenLastCalledWith(
			'/reports/time-and-activity?groupBy=project&clients=acme',
			NOT_SCROLLING
		);
		expect(result.current.filters.clients).toEqual(['acme']);
	});

	it('keeps the other values of the link when the filters are cleared', () => {
		linkMovesTo('groupBy=client&clients=acme');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).toHaveBeenCalledWith('/reports/time-and-activity?groupBy=client', NOT_SCROLLING);
		expect(result.current.params.get('groupBy')).toBe('client');
	});
});
