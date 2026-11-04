import React from 'react';
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink
} from '@/core/components/common/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { IconsDoubleAltArrowLeftOutline, IconsDoubleArrowRounded } from '@/core/components/icons';
import { Button } from '@/core/components/duplicated-components/_button';
interface TimesheetPaginationProps {
	totalPages?: number;
	onPageChange?: (page: number) => void;
	nextPage?: () => void;
	previousPage?: () => void;
	goToPage: (page: number) => void;
	currentPage?: number;
	getPageNumbers: () => (number | string)[];
	dates?: string[];
	totalGroups?: number;
	pageSize?: number;
	pageSizeOptions?: number[];
	onPageSizeChange?: (size: number) => void;
}

/**
 * A component for paginating timesheet data.
 *
 * @param {TimesheetPaginationProps} props - The props for the component.
 * @param {number} [props.totalPages] - The total number of pages.
 * @param {(page: number) => void} [props.onPageChange] - A function to call when the page is changed.
 * @param {(page: number) => void} props.goToPage - A function to call when the user navigates to a specific page.
 * @param {() => void} props.nextPage - A function to call when the user navigates to the next page.
 * @param {() => void} props.previousPage - A function to call when the user navigates to the previous page.
 * @param {number} [props.currentPage] - The current page number.
 * @param {() => (number | string)[]} props.getPageNumbers - A function to get an array of page numbers.
 *
 * @returns {React.ReactElement} - The component element.
 */
function TimesheetPagination({
	totalPages,
	goToPage,
	nextPage,
	previousPage,
	currentPage,
	getPageNumbers,
	dates,
	totalGroups,
	pageSize = 10,
	pageSizeOptions = [10, 20, 30, 50],
	onPageSizeChange
}: TimesheetPaginationProps) {
	return (
		// totalPages > 1
		<>
			{totalPages && totalPages > 1 && (
				<Pagination className="flex flex-row justify-between items-center gap-4 w-full hairline-t border-border px-4 py-3">
					<div className="flex items-center gap-4 text-muted-foreground">
						<span className="text-xs tabular-nums whitespace-nowrap">
							{dates?.length || 0} of {totalGroups || 0} row(s) selected
						</span>
					</div>
					<PaginationContent className="flex justify-end w-full">
						<div className="flex gap-x-3 justify-start items-center pr-2 text-xs text-muted-foreground">
							<span className="whitespace-nowrap">Rows per page</span>
							<Select
								value={pageSize?.toString()}
								onValueChange={(value) => onPageSizeChange?.(Number(value))}
							>
								<SelectTrigger className="h-8 w-[80px] tabular-nums text-foreground">
									<SelectValue placeholder="Page size" />
								</SelectTrigger>
								<SelectContent>
									{pageSizeOptions.map((size) => (
										<SelectItem key={size} value={size.toString()}>
											{size}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<span className="tabular-nums whitespace-nowrap">
								Page {currentPage} of {totalPages}
							</span>
						</div>
						<PaginationItem>
							<Button variant="outline" size="icon" onClick={previousPage} disabled={currentPage === 1}>
								<IconsDoubleAltArrowLeftOutline className="size-4" />
							</Button>
						</PaginationItem>
						{getPageNumbers().map((pageNumber, index) => (
							<PaginationItem key={index}>
								{pageNumber === '...' ? (
									<PaginationEllipsis className="size-8 text-muted-foreground" />
								) : (
									<PaginationLink
										className="cursor-pointer tabular-nums"
										isActive={currentPage === pageNumber}
										onClick={() => goToPage(pageNumber as number)}
									>
										{pageNumber}
									</PaginationLink>
								)}
							</PaginationItem>
						))}
						<PaginationItem>
							<Button
								variant="outline"
								size="icon"
								disabled={currentPage === totalPages}
								onClick={nextPage}
							>
								<IconsDoubleArrowRounded className="size-4" />
							</Button>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</>
	);
}

export default TimesheetPagination;
