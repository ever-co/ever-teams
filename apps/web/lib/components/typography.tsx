import clsxm from '@app/utils/clsxm';
import Link from 'next/link';
import { PropsWithChildren } from 'react';
import { IVariant } from './types';

type Props = PropsWithChildren & { className?: string };

/**
 * <p />
 */
export function Text({ children, className }: Props) {
	return <p className={className}>{children}</p>;
}

/**
 * <Link />
 */
type LinkProps = Parameters<typeof Link>['0'] & {
	variant?: Extract<IVariant, 'primary' | 'dark' | 'light'> | 'default';
	underline?: boolean;
};

Text.Link = ({
	children,
	className,
	href,
	variant = 'primary',
	underline,
	...rest
}: LinkProps) => {
	return (
		<Link
			href={href}
			className={clsxm(
				[
					variant === 'primary' && ['text-primary dark:text-primary-light'],
					variant === 'dark' && ['text-dark dark:text-white'],
					variant === 'light' && ['text-white dark:text-dark'],
					underline && ['underline'],
				],
				className
			)}
			{...rest}
		>
			{children}
		</Link>
	);
};

/**
 * <div />
 */
Text.Div = ({ children, className }: Props) => {
	return <div className={className}>{children}</div>;
};

/**
 * <span /> with error color
 */
Text.Error = ({
	children,
	className,
	...rest
}: Props & React.ComponentPropsWithRef<'span'>) => {
	return (
		<span
			className={clsxm('text-xs text-red-600 font-normal', className)}
			{...rest}
		>
			{children}
		</span>
	);
};

/**
 * <h3 /> with error color
 */
Text.H3 = ({
	children,
	className,
	...rest
}: Props & React.ComponentPropsWithRef<'h3'>) => {
	return (
		<h3
			className={clsxm(
				'text-lg font-medium text-dark dark:text-white',
				className
			)}
			{...rest}
		>
			{children}
		</h3>
	);
};

/**
 * <h1 /> with error color
 */
Text.H1 = ({
	children,
	className,
	...rest
}: Props & React.ComponentPropsWithRef<'h1'>) => {
	return (
		<h1
			className={clsxm(
				'text-3xl font-medium text-[#282048] dark:text-white',
				className
			)}
			{...rest}
		>
			{children}
		</h1>
	);
};
