import { IDay } from '@app/interfaces/IDay';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type DayItem = DropdownItem<IDay>;

export function mapDayItems(DayLIst: IDay[]) {
	const items = DayLIst.map<DayItem>((Day) => {
		return {
			key: Day.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<DayItem
						title={Day.title}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: <DayItem title={Day.title} className="py-2 mb-0" />,
			data: Day
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<DayItem
						title={'Select Days'}
						className="w-full cursor-default"
						color="#F5F5F5"
						disabled
					/>
				</div>
			),
			disabled: true
		});
	}

	return items;
}

export function DayItem({
	title,
	// count,
	// color,
	// disabled,
	className
}: {
	title?: string;
	count?: number;
	className?: string;
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm cursor-pointer mb-0 py-2',
				className
			)}
		>
			<span className={clsxm('text-normal mb-0')}>{title}</span>
		</div>
	);
}
