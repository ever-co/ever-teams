import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import Link from 'next/link';
import { DetailedHTMLProps, forwardRef, HTMLAttributes, PropsWithChildren } from 'react';
import { IVariant } from './types';

type Props = PropsWithChildren<IClassName>;

/**
 * <p />
 */
export const Text = ({ children, ...props }: Props & React.ComponentPropsWithRef<'p'>) => {
	return <p {...props}>{children}</p>;
};

/**
 * <Link />
 */
type LinkProps = Parameters<typeof Link>['0'] & {
	variant?: Extract<IVariant, 'primary' | 'dark' | 'light'> | 'default';
	underline?: boolean;
};

Text.Link = forwardRef<HTMLAnchorElement, LinkProps>(
	({ children, className, href, variant = 'primary', underline, ...rest }, ref) => {
		return (
			<Link
				ref={ref}
				href={href}
				className={clsxm(
					[
						variant === 'primary' && ['text-primary dark:text-primary-light'],
						variant === 'dark' && ['text-default dark:text-white'],
						variant === 'light' && ['text-white dark:text-default'],
						underline && ['underline']
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
Text.Error = forwardRef<HTMLSpanElement, Props & React.ComponentPropsWithRef<'span'>>(
	({ children, className, ...rest }, ref) => {
		return (
			<span
				ref={ref}
				className={clsxm('text-xs text-red-600 dark:text-[#FF9494] font-normal', className)}
				{...rest}
			>
				{children}
			</span>
		);
	}
);

Text.Error.displayName = 'TextError';

/**
 * <h1 /> with error color
 */
type HeadingProps = { as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' } & Props &
	DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;

Text.Heading = forwardRef<HTMLHeadingElement, HeadingProps>(({ children, className, as: asel, ...rest }, ref) => {
	const elClassName = clsxm(
		[
			asel === 'h1' && ['text-3xl font-medium text-[#282048] dark:text-white'],
			asel === 'h3' && ['text-lg font-medium text-default dark:text-white']
		],
		className
	);

	const h1 = (
		<h1 ref={ref} className={elClassName} {...rest}>
			{children}
		</h1>
	);
	return (
		(
			{
				h1,
				h2: (
					<h2 ref={ref} className={elClassName} {...rest}>
						{children}
					</h2>
				),
				h3: (
					<h3 ref={ref} className={elClassName} {...rest}>
						{children}
					</h3>
				),
				h4: (
					<h4 ref={ref} className={elClassName} {...rest}>
						{children}
					</h4>
				),
				h5: (
					<h5 ref={ref} className={elClassName} {...rest}>
						{children}
					</h5>
				),
				h6: (
					<h6 ref={ref} className={elClassName} {...rest}>
						{children}
					</h6>
				)
			} as Record<typeof asel, React.ReactElement>
		)[asel] || h1
	);
});

Text.Heading.displayName = 'TextHeading';

/**
 * <label /> by custom
 */
Text.Label = forwardRef<HTMLLabelElement, Props & React.ComponentPropsWithRef<'label'>>(
	({ children, className, ...rest }) => {
		return (
			<label className={clsxm('ml-2 text-sm font-medium text-gray-900 dark:text-gray-300', className)} {...rest}>
				{children}
			</label>
		);
	}
);

Text.Label.displayName = 'TextLabel';
