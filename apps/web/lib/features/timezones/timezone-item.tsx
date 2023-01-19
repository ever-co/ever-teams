import { ITimezoneItemList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';
// import { SettingsOutlineIcon } from 'lib/components/svgs';
import React from 'react';
export type TimezoneItem = DropdownItem<ITimezoneItemList>;

export function mapTimezoneItems(timezones: ITimezoneItemList[]) {
	const items = timezones.map<TimezoneItem>((timezone, index) => {
		return {
			key: index,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<TimezoneItem
						title={timezone}
						count={timezone.length}
						className={selected ? 'font-medium' : ''}
					/>
					{/* <SettingsOutlineIcon className="cursor-pointer" /> */}
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
					{/* <SettingsOutlineIcon className="opacity-70" /> */}
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
			{/* <div
				className={clsxm(
					'w-[27px] h-[27px]',
					'flex justify-center items-center',
					'rounded-full text-xs text-default dark:text-white',
					'shadow-md',
					disabled && ['dark:text-default']
				)}
				style={{ background: color || `${stc(title)}80` }}
			>
				{title ? (title) : ''}
			</div> */}
			<span className={clsxm('text-normal')}>
				{title} 
			</span>
		</div>
	);
}
