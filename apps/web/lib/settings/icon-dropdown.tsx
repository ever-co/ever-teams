import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'lib/components';
import { mapIconItems, IconItem } from './icon-items';

import { clsxm } from '@app/utils';
import { IIcon } from '@app/interfaces';
import { FieldValues, UseFormSetValue } from 'react-hook-form';

export const IconDropdown = ({
	setValue,
	active,
	iconList,
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IIcon | null;
	iconList: IIcon[];
}) => {
	// TODO: Make this list dynamic once Backend Provide Icon list
	const [icons, setIcons] = useState<IIcon[]>(iconList);

	const items: any = useMemo(() => mapIconItems(icons), [icons]);

	const [iconItem, setIconItem] = useState<IconItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: IconItem) => {
			if (item.data) {
				setIconItem(item);
				setValue('icon', item.data.url);
			}
		},
		[setIconItem, setValue]
	);

	useEffect(() => {
		if (!iconItem) {
			setIconItem(items[0]);
		}
	}, [iconItem, items]);

	useEffect(() => {
		if (active && icons.every((icon) => icon.url !== active.url)) {
			setIcons([...icons, active]);
		}
	}, [icons, setIcons, setIconItem, active]);

	useEffect(() => {
		if (active) {
			setIconItem(items.find((item: any) => item.key === active?.url));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-[150px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium h-[54px] w-[150px]',
					icons.length === 0 && ['py-2']
				)}
				value={iconItem}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};
