import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from '@components/ui/pagination'
import React from 'react'
import { MdKeyboardDoubleArrowLeft, MdKeyboardDoubleArrowRight } from 'react-icons/md';
interface TimesheetPaginationProps {
    totalPages?: number;
    onPageChange?: (page: number) => void;
    nextPage?: () => void;
    previousPage?: () => void;
    goToPage: (page: number) => void;
    currentPage?: number;
    getPageNumbers: () => (number | string)[];
    dates?: string[];
    totalGroups?: number

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
function TimesheetPagination({ totalPages, onPageChange, goToPage, nextPage, previousPage, currentPage, getPageNumbers, dates, totalGroups }: TimesheetPaginationProps) {
    return (
        // totalPages > 1
        <>
            {totalPages && totalPages > 1 && (

                <Pagination className='flex flex-row justify-between items-center  gap-[327px] w-full h-[64px] rounded-b-[6px] p-1'>
                    <div className='text-[#7E7991] font-medium w-full'>
                        Page {currentPage} of {totalPages} ({dates?.length} items of {totalGroups})
                    </div>
                    <PaginationContent className='flex w-full justify-end'>

                        <PaginationItem>
                            <button
                                className='box-border flex flex-row justify-center items-center p-2 gap-2 w-8 h-8 bg-white dark:bg-dark--theme-light border border-gray-200 dark:border-gray-800 shadow-sm rounded-[6px]'
                                onClick={previousPage}
                                disabled={currentPage === 1} >
                                <MdKeyboardDoubleArrowLeft />

                            </button>
                        </PaginationItem>
                        {getPageNumbers().map((pageNumber, index) => (
                            <PaginationItem key={index}>
                                {pageNumber === '...' ? (
                                    <PaginationEllipsis
                                        className='box-border cursor-pointer flex flex-row justify-center items-center p-2 gap-2 w-8 h-8 dark:bg-dark--theme-light border border-gray-200 dark:border-gray-800  shadow-sm rounded-[6px]'
                                    />
                                ) : (
                                    <PaginationLink
                                        className='box-border cursor-pointer flex flex-row justify-center items-center p-2 gap-2 w-8 h-8 dark:bg-dark--theme-light border border-gray-200 dark:border-gray-800 shadow-sm rounded-[6px]'
                                        isActive={currentPage === pageNumber}
                                        onClick={() => goToPage(pageNumber as number)}>
                                        {pageNumber}
                                    </PaginationLink>
                                )}
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <button
                                disabled={currentPage === totalPages}
                                className='box-border flex flex-row justify-center items-center p-2 gap-2 w-8 h-8 dark:bg-dark--theme-light border border-gray-200 dark:border-gray-800 shadow-sm rounded-[6px]'
                                onClick={nextPage}>
                                <MdKeyboardDoubleArrowRight />
                            </button>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )
            }
        </>
    )

}

export default TimesheetPagination
