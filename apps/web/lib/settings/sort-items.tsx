import { ISort } from '@app/interfaces/ISort';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type SortItem = DropdownItem<ISort>;

export function mapSortItems(sortList: ISort[]) {
	const items = sortList.map<SortItem>((sort) => {
		return {
			key: sort.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<SortItem title={sort.title} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <SortItem title={sort.title} className="py-2 mb-0" />,
			data: sort
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<SortItem title={'Sort By'} className="w-full cursor-default" color="#F5F5F5" disabled />
				</div>
			),
			disabled: true
		});
	}

	return items;
}

export function SortItem({
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
