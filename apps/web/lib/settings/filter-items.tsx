import { IFilter } from '@app/interfaces/IFilter';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type FilterItem = DropdownItem<IFilter>;

export function mapFilterItems(FilterLIst: IFilter[]) {
	const items = FilterLIst.map<FilterItem>((filter) => {
		return {
			key: filter.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<FilterItem
						title={filter.title}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: <FilterItem title={filter.title} className="py-2 mb-0" />,
			data: filter
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<FilterItem title={'Filter By'} className="w-full cursor-default" />
				</div>
			),
			disabled: true
		});
	}

	return items;
}

export function FilterItem({
	title,
	className
}: {
	title?: string;
	className?: string;
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
