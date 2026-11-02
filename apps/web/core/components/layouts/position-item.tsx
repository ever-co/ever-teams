import { clsxm } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';

export type PositionItem = DropdownItem<IPosition>;

export interface IPosition {
	title: string;
}

export function mapPositionItems(positions: IPosition[]) {
	const items = positions.map((position: IPosition) => {
		return {
			key: position.title,
			Label: ({ selected }: any) => (
				<div className="flex justify-between">
					<PositionItem title={position.title} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <PositionItem title={position.title} className="py-2 mb-0" />,
			data: position
		};
	});

	return items;
}

export function PositionItem({ title, className }: { title?: string; className?: string; disabled?: boolean }) {
	return (
		<div className={clsxm('mb-4 flex cursor-pointer items-center justify-start gap-2 text-sm', className)}>
			<span>{title}</span>
		</div>
	);
}
