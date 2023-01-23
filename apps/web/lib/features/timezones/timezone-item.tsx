import { ITimezoneItemList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';
import React from 'react';
export type TimezoneItem = DropdownItem<ITimezoneItemList>;

export function mapTimezoneItems(timezones: ITimezoneItemList[]) {
	const items = timezones.map<TimezoneItem>((timezone, index) => {
		return {
			key: index + 1,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<TimezoneItem
						title={timezone}
						count={timezone.length}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: <TimezoneItem title={timezone} className="py-2 mb-0" />,
			data: timezone,
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<TimezoneItem
						title={'All'}
						className="w-full cursor-default"
						color="#F5F5F5"
						disabled
					/>
				</div>
			),
			disabled: true,
		});
	}

	return items;
}

export function TimezoneItem({
	title,
	count,
	className,
	color,
	disabled,
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
				'flex items-center justify-start space-x-2 text-sm cursor-pointer mb-4',
				className
			)}
		>
			<span className={clsxm('text-normal')}>
				{title} 
			</span>
		</div>
	);
}
