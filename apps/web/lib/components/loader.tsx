import { useHasMounted } from '@app/hooks';
import clsxm from '@app/utils/clsxm';
import { createPortal } from 'react-dom';
import { Card } from './card';

export function SpinnerLoader({
	size = 31,
	className,
}: {
	size?: number;
	className?: string;
}) {
	return (
		<span
			className={clsxm(
				'animate-spin',
				'border-t-primary border-r-primary border-b-transparent border-l-primary',
				'dark:border-t-primary-light dark:border-r-primary-light dark:border-b-transparent dark:border-l-primary-light',
				className
			)}
			style={{
				width: `${size}px`,
				height: `${size}px`,
				borderRadius: '100%',
				borderWidth: '2px',
				borderStyle: 'solid',
				borderImage: 'initial',
				display: 'inline-block',
			}}
		/>
	);
}

export function BackdropLoader({
	title,
	show,
}: {
	title?: string;
	show?: boolean;
}) {
	const { mounted } = useHasMounted();

	if (!mounted) {
		return <></>;
	}

	return createPortal(
		<div
			className={clsxm(
				'fixed inset-0 z-[9999]',
				'backdrop-brightness-90 backdrop-blur-sm',
				'flex justify-center items-center',
				[show ? ['fade-in h-full w-full'] : ['fade-out h-0 w-0']]
			)}
		>
			<div>
				<Card
					className="w-[98%] md:min-w-[130px] flex items-center"
					shadow="custom"
				>
					<div className="w-[31px] h-[31px] mr-4">
						<SpinnerLoader className="mr-1" />
					</div>
					<div className="text-xs whitespace-nowrap text-ellipsis">{title}</div>
				</Card>
			</div>
		</div>,
		document.body
	);
}
