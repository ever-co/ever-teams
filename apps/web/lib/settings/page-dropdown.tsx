import { Dropdown } from 'lib/components';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';

import { IPagination } from '@app/interfaces/IPagination';
import { clsxm } from '@app/utils';
import { PaginationItems, mappaginationItems } from './page-items';

export const PaginationDropdown = ({
	setValue,
	active,
}: {
	setValue: Dispatch<SetStateAction<number>>;
	active?: IPagination | null;
}) => {
	const [paginationList, setPagination] = useState<IPagination[]>([
		{
			title: '10',
		},
		{
			title: '20',
		},
		{
			title: '30',
		},
		{
			title: '40',
		},
		{
			title: '50',
		},
	]);

	const items: any = useMemo(
		() => mappaginationItems(paginationList),
		[paginationList]
	);

	const [paginationItem, setPaginationItem] =
		useState<PaginationItems | null>();

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
		if (!paginationItem) {
			setPaginationItem(items[0]);
		}
	}, [paginationItem, items]);

	useEffect(() => {
		if (
			active &&
			paginationList.every((filter) => filter.title !== active.title)
		) {
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
			<Dropdown
				className="min-w-[150px] max-w-sm z-10 dark:bg-dark--theme-light"
				buttonClassName={clsxm(
					'py-0 font-medium h-[45px] w-[145px] z-10 outline-none dark:bg-dark--theme-light',
					paginationList.length === 0 && ['py-2']
				)}
				value={paginationItem}
				onChange={onChangeActiveTeam}
				items={items}
				optionsClassName={'outline-none'}
			></Dropdown>
		</>
	);
};
