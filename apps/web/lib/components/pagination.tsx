import { PaginationDropdown } from 'lib/settings/page-dropdown';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import ReactPaginate, { ReactPaginateProps } from 'react-paginate';

type Props = {
	total: number;
	itemsPerPage?: number;
	itemOffset: number;
	endOffset: number;
	setItemsPerPage: Dispatch<SetStateAction<number>>;
} & ReactPaginateProps;

export function Paginate({ total, itemsPerPage = 10, onPageChange, itemOffset, endOffset, setItemsPerPage }: Props) {
	const { t } = useTranslation();
	const pageCount: number = Math.ceil(total / itemsPerPage);

	return (
		<div className="flex items-center justify-between pt-4" aria-label="Table navigation">
			<ReactPaginate
				breakLabel=". . ."
				nextLabel={
					<div className="block w-10 h-10 justify-center items-center leading-tight text-gray-500 bg-white border border-[#23232329] rounded-r-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-dark--theme-light dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white rounded-[8px] p-2 disabled:opacity-25 outline-none">
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
					<div className="block w-10 h-10 justify-center items-center rounded-[8px] ml-0 leading-tight text-gray-500 bg-white border border-[#23232329] rounded-l-lg hover:bg-gray-100 hover:text-gray-700 dark:bg-dark--theme-light dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white mr-1 p-2 outline-none">
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
				className={'flex items-center justify-between'}
				pageClassName={'pl-4 pr-4 pt-2 pb-2 text-gray-500 font-normal text-[#B1AEBC]'}
				activeClassName={'text-[#1A1C1E] dark:text-white'}
				breakClassName={'pl-5 pr-5 pt-1 pb-2'}
			/>

			<div className="flex items-center gap-x-5">
				<PaginationDropdown setValue={setItemsPerPage} />
				<span className="text-sm font-normal text-gray-500 dark:text-gray-400">
					{`Showing ${itemOffset + 1} to ${endOffset} of ${total} entries`}
				</span>
			</div>
		</div>
	);
}
