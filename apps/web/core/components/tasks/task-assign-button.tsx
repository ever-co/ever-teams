import { clsxm } from '@/core/lib/utils';
import { Button } from '@/core/components';
import { ArrowRightIcon } from 'assets/svg';
import { MouseEventHandler } from 'react';
import { IClassName } from '@/core/types/interfaces/common/class-name';

type Props = {
	onClick?: MouseEventHandler<HTMLButtonElement>;
	disabled: boolean;
	iconClassName?: string;
} & IClassName;

export function TaskAssignButton({ onClick, disabled, className, iconClassName }: Props) {
	return (
		<Button
			onClick={onClick}
			className={clsxm(
				'size-9 inline-block min-w-[14px] !px-0 !py-0',
				'flex justify-center items-center',
				disabled && ['opacity-70 cursor-default'],
				className
			)}
		>
			<ArrowRightIcon className={clsxm('w-[60%] h-[60%]', iconClassName)} />
		</Button>
	);
}
