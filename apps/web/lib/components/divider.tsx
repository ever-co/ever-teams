import { clsxm } from '@app/utils';

export function Divider({ className }: { className?: string }) {
	return <hr className={clsxm('w-full dark:opacity-25', className)} />;
}
