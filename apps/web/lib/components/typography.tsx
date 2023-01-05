import clsxm from '@app/utils/clsxm';
import Link from 'next/link';
import { PropsWithChildren } from 'react';
import { IVariant } from './types';

type Props = PropsWithChildren & { className?: string };

export function Text({ children, className }: Props) {
	return <p className={className}>{children}</p>;
}

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

Text.Div = ({ children, className }: Props) => {
	return <div className={className}>{children}</div>;
};

Text.H3 = ({ children, className }: Props) => {
	return (
		<h3
			className={clsxm(
				'text-lg font-medium text-dark dark:text-white',
				className
			)}
		>
			{children}
		</h3>
	);
};

Text.H1 = ({ children, className }: Props) => {
	return (
		<h1
			className={clsxm(
				'text-3xl font-medium text-[#282048] dark:text-white',
				className
			)}
		>
			{children}
		</h1>
	);
};
