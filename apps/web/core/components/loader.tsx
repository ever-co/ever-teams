import { useHasMounted } from '@app/hooks';
import { clsxm } from '@app/utils';
import { createPortal } from 'react-dom';
import { Card } from './card';

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
			className={clsxm(
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

export function BackdropLoader({
	title,
	show,
	fadeIn = true,
	canCreatePortal = true
}: {
	title?: string;
	show?: boolean;
	fadeIn?: boolean;
	canCreatePortal?: boolean;
}) {
	const { mounted } = useHasMounted();

	const content = (
		<div
			className={clsxm(
				'fixed inset-0 z-[9999]',
				'backdrop-brightness-90 backdrop-blur-sm',
				'flex justify-center items-center',
				[show ? [fadeIn ? ['fade-in'] : ['opacity-100'], 'h-full w-full'] : ['fade-out h-0 w-0']]
			)}
		>
			<div>
				<Card className="w-[98%] md:min-w-[130px] flex items-center justify-center" shadow="custom">
					<div className="flex space-x-4 items-center">
						<div className="w-[31px] h-[31px]">
							<SpinnerLoader className="mr-1" />
						</div>
						{title && <div className="text-xs whitespace-nowrap text-ellipsis">{title}</div>}
					</div>
				</Card>
			</div>
		</div>
	);

	if (!canCreatePortal) {
		return content;
	}

	if (!mounted) {
		return <></>;
	}

	return createPortal(content, document.body);
}
