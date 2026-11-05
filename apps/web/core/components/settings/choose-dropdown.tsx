import { Dropdown } from '@/core/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { clsxm } from '@/core/lib/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { ChooseItem, IChoose, mapChooseItems } from './choose-item';

export const ChooseDropdown = ({
	setValue,
	active
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IChoose | null;
}) => {
	const [chooseList, setChoose] = useState<IChoose[]>([
		{
			title: 'Option 1'
		},
		{
			title: 'Option 2'
		},
		{
			title: 'Option 3'
		}
	]);

	const items: any = useMemo(() => mapChooseItems(chooseList), [chooseList]);

	const [chooseItem, setChooseItem] = useState<ChooseItem | null>();

	const onChangeActiveSort = useCallback(
		(item: ChooseItem) => {
			if (item.data) {
				setChooseItem(item);
				setValue('Choose', item.data.title);
			}
		},
		[setChooseItem, setValue]
	);

	useEffect(() => {
		if (!chooseItem && items.length > 0) {
			setChooseItem(items[0]);
		}
	}, [chooseItem, items]);

	useEffect(() => {
		if (active && chooseList.every((choose) => choose.title !== active.title)) {
			setChoose([...chooseList, active]);
		}
	}, [chooseList, setChoose, active]);

	useEffect(() => {
		if (active) {
			setChooseItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-min max-w-sm bg-card text-foreground"
				buttonClassName={clsxm('h-9 w-64 py-0 text-foreground', chooseList.length === 0 && ['py-2'])}
				value={chooseItem}
				onChange={onChangeActiveSort}
				items={items}
			></Dropdown>
		</>
	);
};
