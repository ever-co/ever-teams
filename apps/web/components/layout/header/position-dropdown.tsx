import { IPosition } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { AutoCompleteDropdown } from 'lib/components';
import { mapPositionItems, PositionItem } from 'lib/features';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const PositionDropDown = ({
	currentPosition,
	onChangePosition,
	disabled
}: {
	currentPosition: string | null;
	onChangePosition: any;
	disabled: boolean;
}) => {
	const [newPosition, setNewPosition] = useState<string>('');
	const [positions, setPositions] = useState<IPosition[]>([
		{
			title: 'UIUX Designer'
		},
		{
			title: 'Data Analyst'
		},
		{
			title: 'Engineer'
		},
		{
			title: 'Front End Developer'
		},
		{
			title: 'Back End Developer'
		},
		{
			title: 'CTO'
		}
	]);
	const handleAddNew = (position: string) => {
		setNewPosition(position);
		setPositions([
			...positions,
			{
				title: position
			}
		]);
	};

	const items = useMemo(() => mapPositionItems(positions), [positions]);

	const [positionItem, setPositionItem] = useState<PositionItem | null>();

	const onChange = useCallback(
		(item: PositionItem) => {
			setPositionItem(item);
			onChangePosition(item.data?.title);
		},
		[onChangePosition]
	);

	useEffect(() => {
		const item = items.find(
			(t) =>
				t.key === currentPosition ||
				t.data.title === currentPosition ||
				t.data.title === newPosition ||
				t.key === newPosition
		);

		if (item && positionItem?.key !== item.key) {
			onChange(item);
		}
	}, [positions, items, currentPosition, positionItem, onChange, newPosition]);

	return (
		<>
			<AutoCompleteDropdown
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
				placeholder="Add Position"
				handleAddNew={handleAddNew}
				disabled={disabled}
			></AutoCompleteDropdown>
		</>
	);
};
