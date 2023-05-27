import { Dropdown } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ISort } from '@app/interfaces/ISort';
import { clsxm } from '@app/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { SortItem, mapSortItems } from './sort-items';

export const SortDropdown = ({
	setValue,
	active,
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: ISort | null;
}) => {
	const [sortList, setSort] = useState<ISort[]>([
		{
			title: 'name',
		},
		{
			title: 'title',
		},
	]);

	const items: any = useMemo(() => mapSortItems(sortList), [sortList]);

	const [sortItem, setSortItem] = useState<SortItem | null>();

	const onChangeActiveSort = useCallback(
		(item: SortItem) => {
			if (item.data) {
				setSortItem(item);
				setValue('filter', item.data.title);
			}
		},
		[setSortItem, setValue]
	);

	useEffect(() => {
		if (!sortItem) {
			setSortItem(items[0]);
		}
	}, [sortItem, items]);

	useEffect(() => {
		if (active && sortList.every((sort) => sort.title !== active.title)) {
			setSort([...sortList, active]);
		}
	}, [sortList, setSort, setSortItem, active]);

	useEffect(() => {
		if (active) {
			setSortItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-[150px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium h-[54px] w-[150px]',
					sortList.length === 0 && ['py-2']
				)}
				value={sortItem}
				onChange={onChangeActiveSort}
				items={items}
			></Dropdown>
		</>
	);
};
