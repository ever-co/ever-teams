import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'lib/components';
import { mapColorItems, IColorItem } from './color-items';

import { clsxm } from '@app/utils';
import { IColor } from '@app/interfaces';
import { FieldValues, UseFormSetValue } from 'react-hook-form';

export const ColorDropdown = ({
	setValue,
	active,
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IColor | null;
}) => {
	const [colors, setColors] = useState<IColor[]>([
		{
			color: '#ECE8FC',
			title: '#ECE8FC',
		},
		{
			color: '#D4EFDF',
			title: '#D4EFDF',
		},
		{
			color: '#D6E4F9',
			title: '#D6E4F9',
		},
		{
			color: '#F5B8B8',
			title: '#F5B8B8',
		},
		{
			color: '#F3D8B0',
			title: '#F3D8B0',
		},
		{
			color: '#F2F2F2',
			title: '#F2F2F2',
		},
		{
			color: '#F5F1CB',
			title: '#F5F1CB',
		},
		{
			color: '#4192AB',
			title: '#4192AB',
		},
		{
			color: '#4E4AE8',
			title: '#4E4AE8',
		},
		{
			color: '#E78F5E',
			title: '#E78F5E',
		},
	]);

	const items = useMemo(() => mapColorItems(colors), [colors]);

	const [colorItem, setColorItem] = useState<IColorItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: IColorItem) => {
			if (item.data) {
				setColorItem(item);
				setValue('color', item.data.color);
			}
		},
		[setColorItem, setValue]
	);

	useEffect(() => {
		if (!colorItem) {
			setColorItem(items[0]);
		}
	}, [colorItem, items]);

	useEffect(() => {
		if (active && colors.every((color) => color.color !== active.color)) {
			setColors([...colors, active]);
		}
	}, [colors, setColors, setColorItem, active]);

	useEffect(() => {
		if (active) {
			setColorItem(items.find((item: any) => item.key === active?.color));
		}
	}, [active, items]);

	return (
		<>
			{/* <SketchPicker /> */}
			<Dropdown
				className="min-w-[150px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium h-[54px] w-[150px]',
					colors.length === 0 && ['py-2']
				)}
				value={colorItem}
				onChange={onChangeActiveTeam}
				items={items}
			/>
		</>
	);
};
