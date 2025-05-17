import { clsxm } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';

export type PermissonItem = DropdownItem<{ name: string }>;

export function PermissonItem({
	title,
	className,
	disabled,
	onClick
}: {
	title?: string;
	className?: string;
	disabled?: boolean;
	onClick: any;
}) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm',
				'cursor-pointer max-w-full',
				className,
				disabled && ['dark:text-default']
			)}
			onClick={onClick}
		>
			<span
				className={clsxm(
					'text-normal',
					'whitespace-nowrap text-ellipsis overflow-hidden capitalize',
					disabled && ['dark:text-default']
				)}
			>
				{title}
			</span>
		</div>
	);
}
