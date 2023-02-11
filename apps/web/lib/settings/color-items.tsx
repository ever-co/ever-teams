import { IColor } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type ColorItem = DropdownItem<IColor>;

export function mapColorItems(colors: IColor[]) {
	const items = colors.map((color: IColor) => {
		return {
			key: color.color,
			Label: ({ selected }: { selected: boolean }) => (
				<div className="flex justify-between w-full">
					<div className="max-w-[90%]">
						<ColorItem
							title={color.color}
							className={clsxm(selected && ['font-medium'])}
							color={color.color}
						/>
					</div>
				</div>
			),
			selectedLabel: (
				<ColorItem
					title={color.color}
					color={color.color}
					className="py-2 mb-0"
				/>
			),
			data: color,
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: '#F5F5F5',
			Label: () => (
				<div className="flex justify-between">
					<ColorItem
						title={'Colors'}
						className="w-full cursor-default"
						color="#F5F5F5"
						disabled
					/>
				</div>
			),
			selectedLabel: (
				<ColorItem title={'Colors'} color={'#F5F5F5'} className="py-2 mb-0" />
			),
			data: { title: 'Colors', color: '#F5F5F5' },
		});
	}

	return items;
}

export function ColorItem({
	title,
	className,
	color,
	disabled,
}: {
	title?: string;
	className?: string;
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div
			title={title}
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm',
				'cursor-pointer mb-4 max-w-full',
				className
			)}
		>
			<div>
				<div
					className={clsxm(
						'w-[17px] h-[17px]',
						'flex justify-center items-center',
						'rounded-full text-xs text-default dark:text-white',
						'shadow-md',
						disabled && ['dark:text-default']
					)}
					style={{ backgroundColor: color }}
				></div>
			</div>
			<span
				className={clsxm(
					'text-normal',
					'whitespace-nowrap text-ellipsis overflow-hidden'
				)}
			>
				{title}
			</span>
		</div>
	);
}
