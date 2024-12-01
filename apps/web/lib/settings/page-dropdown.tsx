'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import { IPagination } from '@app/interfaces/IPagination';
import { clsxm } from '@app/utils';
import { PaginationItems, mappaginationItems } from './page-items';
import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';
import { ChevronDownIcon } from 'lucide-react';

export const PaginationDropdown = ({
	setValue,
	active
}: {
	setValue: Dispatch<SetStateAction<number>>;
	active?: IPagination | null;
}) => {
	const [paginationList, setPagination] = useState<IPagination[]>([
		{
			title: '10'
		},
		{
			title: '20'
		},
		{
			title: '30'
		},
		{
			title: '40'
		},
		{
			title: '50'
		}
	]);

	const items: PaginationItems[] = useMemo(() => mappaginationItems(paginationList), [paginationList]);
	const [open, setOpen] = useState(false);
	const [paginationItem, setPaginationItem] = useState<PaginationItems | null>();

	const onChangeActiveTeam = useCallback(
		(item: PaginationItems) => {
			if (item.data) {
				setPaginationItem(item);
				setValue(+item.data.title);
			}
		},
		[setPaginationItem, setValue]
	);

	useEffect(() => {
		if (!paginationItem && items.length > 0) {
			setPaginationItem(items[0]);
		}
	}, [paginationItem, items]);

	useEffect(() => {
		if (active && paginationList.every((filter) => filter.title !== active.title)) {
			setPagination([...paginationList, active]);
		}
	}, [paginationList, setPagination, setPaginationItem, active]);

	useEffect(() => {
		if (active) {
			setPaginationItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Popover>
				<PopoverTrigger
					onClick={() => setOpen(!open)}
					className={clsxm(
						'input-border',
						'w-full flex justify-between rounded-xl px-3 py-2 text-sm items-center',
						'font-normal outline-none',
						'py-0 font-medium h-[45px] w-[145px] z-10 outline-none dark:bg-dark--theme-light'
					)}
				>
					<span>{paginationItem?.selectedLabel || (paginationItem?.Label && <paginationItem.Label />)}</span>{' '}
					<ChevronDownIcon
						className={clsxm(
							'ml-2 h-5 w-5 dark:text-white transition duration-150 ease-in-out group-hover:text-opacity-80',
							open && 'transform rotate-180'
						)}
						aria-hidden="true"
					/>
				</PopoverTrigger>
				<PopoverContent className="w-36">
					{items.map((Item, index) => (
						<div onClick={() => onChangeActiveTeam(Item)} key={Item.key ? Item.key : index}>
							<Item.Label />
						</div>
					))}
				</PopoverContent>
			</Popover>
		</>
	);
};
