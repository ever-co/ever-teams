import { Dropdown } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { IPagination } from '@app/interfaces/IPagination';
import { clsxm } from '@app/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { PaginationItems, mappaginationItems } from './page-items';

export const PaginationDropdown = ({
	setValue,
	active,
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IPagination | null;
}) => {
	const [paginationList, setPagination] = useState<IPagination[]>([
		{
			title: 'Show 20',
		},
		{
			title: 'Show 30',
		},
		{
			title: 'Show 40',
		},
		{
			title: 'Show 50',
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
				setValue('pagination', item.data.title);
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
				className="min-w-[150px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium h-[54px] w-[150px]',
					paginationList.length === 0 && ['py-2']
				)}
				value={paginationItem}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};
