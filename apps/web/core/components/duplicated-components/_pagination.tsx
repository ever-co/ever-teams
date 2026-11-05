import { PaginationItemsDropdown } from '@/core/components/settings/page-dropdown';
import { useTranslations } from 'next-intl';
import { Dispatch, SetStateAction } from 'react';
import ReactPaginate, { ReactPaginateProps } from 'react-paginate';
import { cn } from '@/core/lib/helpers';
import { buttonVariants } from '@/core/components/duplicated-components/_button';

const pageStepClassName = buttonVariants({ variant: 'outline', size: 'icon' });

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
				activeLinkClassName="font-semibold text-foreground"
				breakLabel=". . ."
				nextLabel={
					<div className={cn(pageStepClassName, 'relative text-muted-foreground')}>
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
					<div className={cn(pageStepClassName, 'relative mr-1 text-muted-foreground')}>
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
				pageClassName={
					'flex min-w-8 h-8 items-center justify-center rounded-md px-2 text-sm tabular-nums text-muted-foreground transition-colors hover:bg-foreground/5'
				}
				activeClassName={'bg-foreground/5 text-foreground'}
				breakClassName={'px-2 text-muted-foreground'}
			/>

			<div className="flex relative gap-x-5 items-center">
				<PaginationItemsDropdown onChange={setItemsPerPage} totalItems={total} itemsPerPage={itemsPerPage} />
				<div className="text-sm tabular-nums text-muted-foreground">
					{`Showing ${itemOffset + 1} to ${Math.min(endOffset, total)} of ${total} entries`}
				</div>
			</div>
		</div>
	);
}
