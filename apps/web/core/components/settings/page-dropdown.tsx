'use client';

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import { IPagination } from '@/core/types/interfaces/IPagination';
import { clsxm } from '@/core/lib/utils';
import { PaginationItems, mappaginationItems } from './page-items';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/ui/popover';
import { ChevronDownIcon } from 'lucide-react';

export const PaginationDropdown = ({
	setValue,
	active,
	total
}: {
	setValue: Dispatch<SetStateAction<number>>;
	active?: IPagination | null;
	total?: number;
}) => {
	const calculatePaginationOptions = useCallback((total = 0) => {
		const baseOptions = [10, 20, 30, 40, 50];

		if (total > 50) {
			const nextOption = Math.ceil(total / 10) * 10;
			if (!baseOptions.includes(nextOption)) {
				baseOptions.push(nextOption);
			}
		}
		baseOptions.sort((a, b) => a - b);

		return baseOptions.map((size) => ({
			title: size.toString()
		}));
	}, []);

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

	useEffect(() => {
		if (total) {
			setPagination(calculatePaginationOptions(total));
		}
	}, [total, calculatePaginationOptions]);

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
						'flex justify-between items-center px-3 py-2 w-full text-sm rounded-xl',
						'font-normal outline-none',
						'z-10 py-0 font-medium outline-none h-[45px] w-[145px] dark:bg-dark--theme-light'
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
