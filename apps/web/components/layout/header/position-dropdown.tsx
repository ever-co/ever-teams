import { IPosition } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Dropdown } from 'lib/components';
import { mapPositionItems, PositionItem } from 'lib/features';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const PositionDropDown = ({
	currentPosition,
	onChangePosition,
}: {
	currentPosition: string | null;
	onChangePosition: any;
}) => {
	const positions: IPosition[] = useMemo(
		() => [
			{
				title: 'UIUX Designer',
			},
			{
				title: 'Data Analyst',
			},
			{
				title: 'Engineer',
			},
			{
				title: 'Front End Developer',
			},
			{
				title: 'Back End Developer',
			},
			{
				title: 'CTO',
			},
		],
		[]
	);

	const items = useMemo(() => mapPositionItems(positions), [positions]);

	const [positionItem, setPositionItem] = useState<PositionItem | null>();

	useEffect(() => {
		const item = items.find(
			(t) => t.key === currentPosition || t.data.title === currentPosition
		);

		if (item && positionItem?.key !== item.key) {
			setPositionItem(item);
		}
	}, [positions, items, currentPosition, positionItem]);

	const onChange = useCallback(
		(item: PositionItem) => {
			setPositionItem(item);
			onChangePosition(item.data?.title);
		},
		[onChangePosition]
	);

	return (
		<>
			<Dropdown
				className="w-full"
				buttonClassName={clsxm(
					`py-0 font-normal h-[3.1rem] w-full ${
						!currentPosition ? 'text-gray-400' : ''
					}`,
					items.length === 0 && ['py-2']
				)}
				value={positionItem}
				onChange={(e: any) => onChange(e)}
				items={items}
			></Dropdown>
		</>
	);
};
