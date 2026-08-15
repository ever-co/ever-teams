import Link from 'next/link';
import {
	DetailedHTMLProps,
	ForwardRefExoticComponent,
	HTMLAttributes,
	PropsWithChildren,
	ReactNode,
	RefAttributes,
	forwardRef
} from 'react';
import { cn, IClassName } from '@ever-teams/toolkit-ui';
import { IVariant } from './types';

type Props = PropsWithChildren<IClassName>;

type CompoundComponent<P, T> = ForwardRefExoticComponent<Omit<P, 'ref'> & RefAttributes<T>>;

interface TextCompoundComponents {
	P: CompoundComponent<Props & React.ComponentPropsWithRef<'p'>, HTMLParagraphElement>;
	Link: CompoundComponent<LinkProps, HTMLAnchorElement>;
	Div: CompoundComponent<Props, HTMLDivElement>;
	Error: CompoundComponent<Props & React.ComponentPropsWithRef<'span'>, HTMLSpanElement>;
	Heading: CompoundComponent<HeadingProps, HTMLHeadingElement>;
	Label: CompoundComponent<Props & React.ComponentPropsWithRef<'label'>, HTMLLabelElement>;
}

type TextComponent = CompoundComponent<Props & React.ComponentPropsWithRef<'div'>, HTMLDivElement> &
	TextCompoundComponents;

type LinkProps = Parameters<typeof Link>[0] & {
	variant?: Extract<IVariant, 'primary' | 'dark' | 'light'> | 'default';
	underline?: boolean;
	className?: string;
	children?: ReactNode;
};

type HeadingProps = {
	as: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
	className?: string;
	children?: ReactNode;
} & Props &
	DetailedHTMLProps<HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;

export const Text = forwardRef<HTMLDivElement, Props & React.ComponentPropsWithRef<'div'>>(
	({ children, ...props }, ref) => {
		return (
			<div {...props} ref={ref}>
				{children}
			</div>
		);
	}
) as TextComponent;

Text.displayName = 'Text';

/**
 * <P />
 */
Text.P = forwardRef<HTMLParagraphElement, Props & React.ComponentPropsWithRef<'p'>>(({ children, ...props }, ref) => {
	return (
		<p {...props} ref={ref}>
			{children}
		</p>
	);
});

Text.P.displayName = 'TextParagraph';

/**
 * <Link />
 */
Text.Link = forwardRef<HTMLAnchorElement, LinkProps>(
	({ children, className, href, variant = 'primary', underline, ...rest }, ref) => {
		return (
			<Link
				ref={ref}
				href={href}
				className={cn(
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
			<span ref={ref} className={cn('text-xs text-red-600 dark:text-[#FF9494] font-normal', className)} {...rest}>
				{children}
			</span>
		);
	}
);

Text.Error.displayName = 'TextError';

/**
 * <h1 /> heading component with error color
 */
Text.Heading = forwardRef<HTMLHeadingElement, HeadingProps>(({ children, className, as: asel, ...rest }, ref) => {
	const elClassName = cn(
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
	({ children, className, ...rest }, ref) => {
		return (
			<label
				ref={ref}
				className={cn('ml-2 text-sm font-medium text-gray-900 dark:text-gray-300', className)}
				{...rest}
			>
				{children}
			</label>
		);
	}
);

Text.Label.displayName = 'TextLabel';
