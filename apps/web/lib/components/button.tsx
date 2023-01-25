import { clsxm } from '@app/utils';
import { PropsWithChildren } from 'react';
import { SpinnerLoader } from './loader';
import { ArrowLeft } from './svgs';

type Props = {
	variant?:
		| 'primary'
		| 'outline'
		| 'ghost'
		| 'light'
		| 'dark'
		| 'grey'
		| 'danger';
	loading?: boolean;
} & PropsWithChildren &
	React.ComponentPropsWithRef<'button'>;

export function Button({
	children,
	className,
	variant = 'primary',
	loading,
	...rest
}: Props) {
	return (
		<button
			className={clsxm(
				'flex flex-row items-center justify-center py-3 px-4 gap-3 rounded-md min-w-[140px]',
				[
					variant === 'primary' && [
						'bg-primary dark:bg-primary-light text-white text-sm',
						'disabled:bg-primary-light disabled:opacity-40',
						// 'disabled:bg-primary-light dark:disabled:bg-[#33353E] disabled:opacity-40 dark:disabled:opacity-50',
					],
					variant === 'outline' && [
						'text-primary border border-primary font-medium',
						'dark:text-white border dark:border-white',
						'disabled:opacity-40',
					],
					variant === 'grey' && [
						'disabled:opacity-40',
						'bg-light--theme-dark',
						'dark:bg-[#1D222A]',
					],
					variant === 'danger' && [
						'disabled:opacity-40 bg-[#EB6961] text-white dark:bg-[#EB6961] text-base font-semibold',
					],
				],
				className
			)}
			{...rest}
		>
			{loading && (
				<SpinnerLoader
					size={17}
					variant={variant === 'outline' ? 'primary' : 'light'}
				/>
			)}
			{children}
		</button>
	);
}

type RoundedButtonProps = PropsWithChildren &
	React.ComponentPropsWithRef<'button'>;

export function RoundedButton({
	children,
	className,
	...rest
}: RoundedButtonProps) {
	return (
		<button
			className={clsxm(
				'bg-white dark:bg-dark-lighter dark:text-white rounded-full',
				'shadow-[0px_4px_24px_rgba(0,0,0,0.25)] dark:shadow-darker',
				'flex justify-center items-center text-default',
				className
			)}
			{...rest}
		>
			{children}
		</button>
	);
}

export function BackButton({
	onClick,
	className,
}: {
	onClick?: () => void;
	className?: string;
}) {
	return (
		<button
			type="button"
			className={clsxm('flex items-center', className)}
			onClick={onClick}
		>
			<ArrowLeft className="mr-2" />
			<span className="text-sm">Back</span>
		</button>
	);
}
