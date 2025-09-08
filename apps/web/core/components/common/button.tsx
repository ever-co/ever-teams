import { clsxm } from '@/core/lib/utils';
import { PropsWithChildren, cloneElement, isValidElement } from 'react';
import { SpinnerLoader } from './loader';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from 'assets/svg';

type Props = {
	variant?:
		| 'primary'
		| 'outline'
		| 'outline-dark'
		| 'outline-danger'
		| 'ghost'
		| 'light'
		| 'dark'
		| 'grey'
		| 'danger';
	loading?: boolean;
	asChild?: boolean;
} & PropsWithChildren &
	React.ComponentPropsWithRef<'button'>;

/**
 * `export function Button({ children, className, variant = 'primary', loading, asChild, ...rest }: Props)`
 *
 * The above function is a React component that takes in the following props:
 *
 * - `children`: The content of the button.
 * - `className`: A class name that can be used to override the default styles.
 * - `variant`: The variant of the button. The default value is `primary`.
 * - `loading`: A boolean value that determines whether the button is loading or not.
 * - `asChild`: When true, renders the first child element with button styles instead of a button element.
 * - `...rest`: Any other props that are not listed above
 * @param {Props}  - `children` - The content of the button.
 * @returns A button with a spinner loader inside of it, or the child element with button styles when asChild is true.
 */
export function Button({ children, className, variant = 'primary', loading, asChild = false, ...rest }: Props) {
	const buttonClasses = clsxm(
		'flex flex-row items-center justify-center py-3 px-4 gap-3 rounded-md min-w-fit',
		[
			variant === 'primary' && [
				'bg-primary dark:bg-primary-light text-white text-sm',
				'disabled:bg-primary-light disabled:opacity-40'
				// 'disabled:bg-primary-light dark:disabled:bg-[#33353E] disabled:opacity-40 dark:disabled:opacity-50',
			],
			variant === 'outline' && [
				'text-primary border border-primary font-medium',
				'dark:text-white border dark:border-white',
				'disabled:opacity-40'
			],
			variant === 'outline-dark' && ['input-border font-medium', 'disabled:opacity-40'],
			variant === 'grey' && [
				'disabled:opacity-40',
				'bg-light--theme-dark',
				'dark:bg-light--theme-dark',
				'dark:text-primary'
			],
			variant === 'danger' && [
				'disabled:opacity-40 bg-[#EB6961] text-white dark:bg-[#EB6961] text-base font-semibold'
			],
			variant === 'outline-danger' && [
				'text-[#EB6961] border border-[#EB6961] font-medium',
				'disabled:opacity-40'
			]
		],
		className
	);

	const content = (
		<>
			{loading && <SpinnerLoader size={17} variant={variant === 'outline' ? 'primary' : 'light'} />}
			{children}
		</>
	);

	if (asChild && isValidElement(children)) {
		const childProps = children.props as any;
		const newProps = {
			...rest,
			// Announce loading state for non-button children (e.g., <a/>, <Link/>)
			'aria-busy': loading || undefined,
			className: clsxm(buttonClasses, childProps.className)
		};

		const newChildren = loading ? (
			<>
				<SpinnerLoader size={17} variant={variant === 'outline' ? 'primary' : 'light'} />
				{childProps.children}
			</>
		) : (
			childProps.children
		);

		return cloneElement(children as any, newProps, newChildren);
	}

	return (
		<button
			{...rest}
			type={rest?.type ?? 'button'}
			disabled={rest?.disabled ?? !!loading}
			aria-busy={loading || undefined}
			className={buttonClasses}
		>
			{content}
		</button>
	);
}

type RoundedButtonProps = PropsWithChildren & React.ComponentPropsWithRef<'button'>;

export function RoundedButton({ children, className, ...rest }: RoundedButtonProps) {
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

export function BackButton({ onClick, className }: { onClick?: () => void; className?: string }) {
	const t = useTranslations();
	return (
		<button type="button" className={clsxm('flex justify-start items-center text-sm', className)}>
			<ArrowLeftIcon className="w-full max-w-[20px]" />
			<span className="text-sm" onClick={onClick}>
				{t('common.BACK')}
			</span>
		</button>
	);
}
