import { IChoose } from '@app/interfaces/IChoose';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type ChooseItem = DropdownItem<IChoose>;

export function mapChooseItems(choosList: IChoose[]) {
	const items = choosList.map<ChooseItem>((choose) => {
		return {
			key: choose.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<ChooseItem
						title={choose.title}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: <ChooseItem title={choose.title} className="py-2 mb-0" />,
			data: choose
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<ChooseItem
						title={'Choose'}
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

export function ChooseItem({
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
