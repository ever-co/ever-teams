import clsxm from '@app/utils/clsxm';
import Link from 'next/link';
import { forwardRef, PropsWithChildren } from 'react';
import { IVariant } from './types';

type Props = PropsWithChildren & { className?: string };

/**
 * <p />
 */
export const Text = ({ children, className }: Props) => {
	return <p className={className}>{children}</p>;
};

/**
 * <Link />
 */
type LinkProps = Parameters<typeof Link>['0'] & {
	variant?: Extract<IVariant, 'primary' | 'dark' | 'light'> | 'default';
	underline?: boolean;
};

Text.Link = forwardRef<HTMLAnchorElement, LinkProps>(
	(
		{ children, className, href, variant = 'primary', underline, ...rest },
		ref
	) => {
		return (
			<Link
				ref={ref}
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
	}
);

Text.Link.displayName = 'TextLink';

/**
 * <div />
 */
Text.Div = forwardRef<HTMLDivElement, Props>(({ children, className }, ref) => {
	return (
		<div className={className} ref={ref}>
			{children}
		</div>
	);
});

Text.Div.displayName = 'TextDiv';

/**
 * <span /> with error color
 */
Text.Error = forwardRef<
	HTMLSpanElement,
	Props & React.ComponentPropsWithRef<'span'>
>(({ children, className, ...rest }, ref) => {
	return (
		<span
			ref={ref}
			className={clsxm('text-xs text-red-600 font-normal', className)}
			{...rest}
		>
			{children}
		</span>
	);
});

Text.Error.displayName = 'TextError';

/**
 * <h3 /> with error color
 */
Text.H3 = forwardRef<
	HTMLHeadingElement,
	Props & React.ComponentPropsWithRef<'h3'>
>(({ children, className, ...rest }, ref) => {
	return (
		<h3
			ref={ref}
			className={clsxm(
				'text-lg font-medium text-dark dark:text-white',
				className
			)}
			{...rest}
		>
			{children}
		</h3>
	);
});

Text.H3.displayName = 'TextH3';

/**
 * <h1 /> with error color
 */
Text.H1 = forwardRef<
	HTMLHeadingElement,
	Props & React.ComponentPropsWithRef<'h1'>
>(({ children, className, ...rest }, ref) => {
	return (
		<h1
			ref={ref}
			className={clsxm(
				'text-3xl font-medium text-[#282048] dark:text-white',
				className
			)}
			{...rest}
		>
			{children}
		</h1>
	);
});

Text.H1.displayName = 'TextH1';
