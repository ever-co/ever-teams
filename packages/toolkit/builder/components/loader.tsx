import { cn } from '@ever-teams/toolkit-ui';

export function SpinnerLoader({
	size = 31,
	className,
	variant = 'primary'
}: {
	size?: number;
	className?: string;
	variant?: 'primary' | 'light' | 'dark' | 'dark-white';
}) {
	return (
		<span
			className={cn(
				'animate-spin',
				[
					variant === 'primary' && [
						'border-t-primary border-r-primary border-b-transparent border-l-primary',
						'dark:border-t-white dark:border-r-white dark:border-b-transparent dark:border-l-white'
					],
					variant === 'light' && ['border-t-white border-r-white border-b-transparent border-l-white'],
					variant === 'dark' && ['border-t-default border-r-default border-b-transparent border-l-default'],
					variant === 'dark-white' && [
						'border-t-default border-r-default border-b-transparent border-l-default',
						'dark:border-t-white dark:border-r-white dark:border-b-transparent dark:border-l-white'
					]
				],
				className
			)}
			style={{
				width: `${size}px`,
				height: `${size}px`,
				borderRadius: '100%',
				borderWidth: '2px',
				borderStyle: 'solid',
				borderImage: 'initial',
				display: 'inline-block'
			}}
		/>
	);
}
