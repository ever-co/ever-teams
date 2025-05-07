import { useState, useMemo } from 'react';
import { GroupedTimesheet } from './use-timesheet';

interface PaginationState {
	currentPage: number;
	totalPages: number;
	totalGroups: number;
	totalTasks: number;
	dates: string[];
}

interface UseTimesheetPaginationProps {
	data: GroupedTimesheet[];
	pageSize?: number;
}

/**
 * Custom hook for paginating grouped timesheet data.
 *
 * @param {GroupedTimesheet[]} data - An array of grouped timesheet data, each group containing a date and associated tasks.
 * @param {number} [pageSize=10] - The number of groups to show per page.
 *
 * @returns {Object} - An object containing pagination details and functions.
 * @property {GroupedTimesheet[]} paginatedGroups - The currently visible groups based on pagination.
 * @property {number} currentPage - The current page number.
 * @property {number} totalPages - The total number of pages available.
 * @property {number} totalGroups - The total number of groups in the data.
 * @property {number} totalTasks - The total number of tasks across all groups.
 * @property {string[]} dates - The dates of the currently visible groups.
 * @property {function} goToPage - A function to navigate to a specific page.
 * @property {function} nextPage - A function to navigate to the next page.
 * @property {function} previousPage - A function to navigate to the previous page.
 * @property {function} getPageNumbers - A function to get an array of page numbers for pagination controls.
 */

export function useTimesheetPagination({ data, pageSize = 10 }: UseTimesheetPaginationProps) {
	const [currentPage, setCurrentPage] = useState(1);

	const paginationState = useMemo<PaginationState>(() => {
		const totalGroups = data.length;
		const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
		const validCurrentPage = Math.min(currentPage, totalPages);

		const startIndex = (validCurrentPage - 1) * pageSize;
		const endIndex = Math.min(startIndex + pageSize, totalGroups);
		const paginatedDates = data.slice(startIndex, endIndex).map((group) => group.date);

		const totalTasks = data.reduce((sum, group) => sum + group.tasks.length, 0);

		return {
			currentPage: validCurrentPage,
			totalPages,
			totalGroups,
			totalTasks,
			dates: paginatedDates
		};
	}, [data, pageSize, currentPage]);

	const paginatedGroups = useMemo(() => {
		const startIndex = (paginationState.currentPage - 1) * pageSize;
		const endIndex = Math.min(startIndex + pageSize, data.length);
		return data.slice(startIndex, endIndex);
	}, [data, pageSize, paginationState.currentPage]);

	const goToPage = (page: number) => {
		setCurrentPage(Math.max(1, Math.min(page, paginationState.totalPages)));
	};

	const nextPage = () => {
		if (currentPage < paginationState.totalPages) {
			goToPage(currentPage + 1);
		}
	};

	const previousPage = () => {
		if (currentPage > 1) {
			goToPage(currentPage - 1);
		}
	};

	const getPageNumbers = (): (number | string)[] => {
		const { currentPage, totalPages } = paginationState;
		const delta = 2;
		const range: (number | string)[] = [];

		for (let i = 1; i <= totalPages; i++) {
			if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
				range.push(i);
			} else if (range[range.length - 1] !== '...') {
				range.push('...');
			}
		}

		return range;
	};

	return {
		paginatedGroups,
		currentPage: paginationState.currentPage,
		totalPages: paginationState.totalPages,
		totalGroups: paginationState.totalGroups,
		totalTasks: paginationState.totalTasks,
		dates: paginationState.dates,
		goToPage,
		nextPage,
		previousPage,
		getPageNumbers
	};
}
