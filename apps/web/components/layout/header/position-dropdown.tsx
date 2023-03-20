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
	const positions = [
		'UIUX Designer',
		'Engineer',
		'Front End Developer',
		'Back End Developer',
		'Data Analyst',
		'CTO',
	];

	const items = useMemo(() => mapPositionItems(positions), [positions]);

	const [positionItem, setPositionItem] = useState<PositionItem | null>(null);

	useEffect(() => {
		const item = items.find(
			(t) => t.key === currentPosition || t.data === currentPosition
		);

		if (item && positionItem?.key !== item.key) {
			setPositionItem(item);
		}
	}, [positions, items, currentPosition]);

	const onChange = useCallback(
		(item: PositionItem) => {
			console.log(item);
			setPositionItem(item);
			onChangePosition(item.data);
		},
		[onChangePosition]
	);

	return (
		<>
			<Dropdown
				className="w-full"
				buttonClassName={clsxm(
					'py-0 font-medium h-[3.1rem] w-full',
					items.length === 0 && ['py-2']
				)}
				value={positionItem as any}
				onChange={(e: any) => onChange(e)}
				items={items as any}
			></Dropdown>
		</>
	);
};
