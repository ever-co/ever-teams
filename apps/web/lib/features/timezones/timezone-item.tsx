import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';
export type TimezoneItem = DropdownItem<string>;

export function mapTimezoneItems(timezones: string[]) {
	const items = timezones.map<TimezoneItem>((timezone) => {
		return {
			key: timezone,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<TimezoneItem
						title={timezone.split('_').join(' ')}
						count={timezone.length}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: (
				<TimezoneItem
					title={timezone.split('_').join(' ')}
					className="py-2 mb-0"
				/>
			),
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
	className,
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
			<span className={clsxm('text-normal')}>{title}</span>
		</div>
	);
}
