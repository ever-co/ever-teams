import { IPeriod } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type PeriodItem = DropdownItem<IPeriod>;

export function mapPeriodItems(PeriodList: IPeriod[]) {
	const items = PeriodList.map<PeriodItem>((Period) => {
		return {
			key: Period.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<PeriodItem title={Period.title} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <PeriodItem title={Period.title} className="py-2 mb-0" />,
			data: Period
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<PeriodItem title={'Select Period'} className="w-full cursor-default" color="#F5F5F5" disabled />
				</div>
			),
			disabled: true
		});
	}

	return items;
}

export function PeriodItem({
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
		<div className={clsxm('flex items-center justify-start space-x-2 text-sm cursor-pointer mb-0 py-2', className)}>
			<span className={clsxm('text-normal mb-0')}>{title}</span>
		</div>
	);
}
