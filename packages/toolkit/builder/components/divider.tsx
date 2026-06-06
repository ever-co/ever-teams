import { cn, IClassName } from '@ever-teams/toolkit-ui';

export function Divider({ className, type = 'HORIZONTAL' }: IClassName) {
	if (type === 'HORIZONTAL') {
		return <hr className={cn('w-full dark:opacity-25', className)} />;
	}

	if (type === 'VERTICAL') {
		return <div className={cn('h-full w-[1px] bg-[#b1aebc80]', className)}></div>;
	}

	return <hr className={cn('w-full dark:opacity-25', className)} />;
}
