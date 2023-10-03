import { INotify } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type NotifyItem = DropdownItem<INotify>;

export function mapNotifyItems(NotifyLIst: INotify[]) {
	const items = NotifyLIst.map<NotifyItem>((Notify) => {
		return {
			key: Notify.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<NotifyItem
						title={Notify.title}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: <NotifyItem title={Notify.title} className="py-2 mb-0" />,
			data: Notify
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<NotifyItem
						title={'Pending'}
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

export function NotifyItem({
	title,
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
