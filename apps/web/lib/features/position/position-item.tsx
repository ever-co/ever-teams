import { IPosition } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type PositionItem = DropdownItem<IPosition>;

export function mapPositionItems(positions: IPosition[]) {
	const items = positions.map((position: IPosition) => {
		return {
			key: position.title,
			Label: ({ selected }: any) => (
				<div className="flex justify-between">
					<PositionItem
						title={position.title}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: (
				<PositionItem title={position.title} className="py-2 mb-0" />
			),
			data: position,
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: '',
			Label: () => (
				<div className="flex justify-between">
					<PositionItem
						title={''}
						className="w-full cursor-default disabled"
						disabled
					/>
				</div>
			),
			selectedLabel: (
				<PositionItem
					title={'Add Position'}
					disabled
					className="py-2 mb-0 disabled"
				/>
			),
			data: { title: 'Add Position' },
		});
	}

	return items;
}

export function PositionItem({
	title,
	className,
}: {
	title?: string;
	className?: string;
	disabled?: boolean;
}) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm cursor-pointer mb-4',
				className
			)}
		>
			<span className={clsxm('text-normal')}>{title}</span>
		</div>
	);
}
