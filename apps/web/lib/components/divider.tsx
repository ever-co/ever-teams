import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';

export function Divider({ className }: IClassName) {
	return <hr className={clsxm('w-full dark:opacity-25', className)} />;
}
