import clsxm from '@app/utils/clsxm';

export function Divider({ className }: { className?: string }) {
	return <hr className={clsxm('w-full dark:opacity-25', className)} />;
}
