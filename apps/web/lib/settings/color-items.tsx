import { IColor } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type IColorItem = DropdownItem<IColor>;

export function mapColorItems(colors: IColor[]) {
	const items = colors.map<IColorItem>((color: IColor) => {
		return {
			key: color.color,
			Label: ({ selected }) => (
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
