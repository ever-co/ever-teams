import { Dropdown } from '@/core/components';
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

import { IFilter } from '@/core/types/interfaces/to-review/IFilter';
import { clsxm } from '@/core/lib/utils';
import { FilterItem, mapFilterItems } from './filter-items';

type MemberSettingfilterByType = 'Name' | 'Title' | 'Roles' | 'Joined/Left' | 'Status';

export const FilterDropdown = ({
	setValue,
	active
}: {
	setValue: Dispatch<SetStateAction<MemberSettingfilterByType>>;
	active?: IFilter | null;
}) => {
	const [filterList, setFilter] = useState<IFilter[]>([
		{
			title: 'Name'
		},
		{
			title: 'Title'
		},
		{
			title: 'Roles'
		},
		{
			title: 'Joined/Left'
		},
		{
			title: 'Status'
		}
	]);

	const items: any = useMemo(() => mapFilterItems(filterList), [filterList]);

	const [filterItem, setFilterItem] = useState<FilterItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: FilterItem) => {
			if (item.data) {
				setFilterItem(item);
				setValue(item.data.title as MemberSettingfilterByType);
			}
		},
		[setFilterItem, setValue]
	);

	useEffect(() => {
		if (!filterItem && items.length > 0) {
			setFilterItem(items[0]);
		}
	}, [filterItem, items]);

	useEffect(() => {
		if (active && filterList.every((filter) => filter.title !== active.title)) {
			setFilter([...filterList, active]);
		}
	}, [filterList, setFilter, setFilterItem, active]);

	useEffect(() => {
		if (active) {
			setFilterItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-[120px] max-w-sm bg-[#FCFCFC]"
				buttonClassName={clsxm(
					'py-0 font-medium h-[45px] w-[120px] text-[#B1AEBC]',
					filterList.length === 0 && ['py-2']
				)}
				value={filterItem}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};
