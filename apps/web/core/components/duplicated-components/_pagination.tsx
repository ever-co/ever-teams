import { PaginationDropdown } from '@/core/components/settings/page-dropdown';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction } from 'react';
import ReactPaginate, { ReactPaginateProps } from 'react-paginate';
import { cn } from '@/core/lib/helpers';

type Props = {
	total: number;
	itemsPerPage: number;
	itemOffset: number;
	endOffset: number;
	setItemsPerPage: Dispatch<SetStateAction<number>>;
	className?: string;
	pageCount: number;
} & ReactPaginateProps;

export function Paginate({
	total,
	itemsPerPage,
	onPageChange,
	itemOffset,
	endOffset,
	setItemsPerPage,
	className,
	pageCount
}: Props) {
	const t = useTranslations();

	return (
		<div
			className={cn('flex relative flex-col gap-2 justify-between items-center pt-4 md:flex-row', className)}
			aria-label="Table navigation"
		>
			<ReactPaginate
				activeLinkClassName="text-primary font-bold"
				breakLabel=". . ."
				nextLabel={
					<div className="block relative w-10 h-10 justify-center items-center leading-tight text-gray-500 bg-white border border-[#23232329] rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-dark--theme-light dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white rounded-[8px] p-2 disabled:opacity-25 outline-none">
						<span className="sr-only">{t('common.NEXT')}</span>
						<svg
							className="w-5 h-5"
							aria-hidden="true"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
								clipRule="evenodd"
							></path>
						</svg>
					</div>
				}
				onPageChange={onPageChange}
				pageRangeDisplayed={1}
				pageCount={pageCount}
				previousLabel={
					<div className="block relative w-10 h-10 justify-center items-center rounded-[8px] ml-0 leading-tight text-gray-500 bg-white border border-[#23232329] rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-dark--theme-light dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white mr-1 p-2 outline-none">
						<span className="sr-only">{t('common.PREV')}</span>
						<svg
							className="w-5 h-5"
							aria-hidden="true"
							fill="currentColor"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
								clipRule="evenodd"
							></path>
						</svg>
					</div>
				}
				renderOnZeroPageCount={null}
				className={'flex justify-between items-center'}
				pageClassName={'pl-4 pr-4 pt-2 pb-2 text-gray-500 font-normal text-[#B1AEBC]'}
				activeClassName={'text-[#1A1C1E] dark:text-white'}
				breakClassName={'pl-5 pr-5 pt-1 pb-2'}
			/>

			<div className="flex relative gap-x-5 items-center">
				<PaginationDropdown itemPerPage={itemsPerPage} onChange={setItemsPerPage} totalItems={total} />
				<div className="min-w-[240px] text-sm font-normal text-gray-500 dark:text-gray-400">
					{`Showing ${itemOffset + 1} to ${Math.min(endOffset, total)} of ${total} entries`}
				</div>
			</div>
		</div>
	);
}
//
