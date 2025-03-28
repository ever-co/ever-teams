import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button } from 'lib/components';
import { ArrowRightIcon } from 'assets/svg';
import { MouseEventHandler } from 'react';

type Props = {
	onClick?: MouseEventHandler<HTMLButtonElement>;
	disabled: boolean;
	iconClassName?: string
} & IClassName;

export function TaskAssignButton({ onClick, disabled, className, iconClassName }: Props) {
	return (
		<Button
			onClick={onClick}
			className={clsxm(
				'dark:bg-primary bg-white',
				'w-14 h-14 rounded-full inline-block min-w-[14px] !px-0 !py-0',
				'flex justify-center items-center dark:border-[#28292F] dark:border',
				'shadow-primary/30 shadow-xl drop-shadow-3xl dark:shadow-lgcard-white',
				disabled && ['opacity-70 cursor-default'],
				className
			)}
		>
			<ArrowRightIcon className={clsxm("w-[60%] h-[60%]", iconClassName)} />
		</Button>
	);
}
