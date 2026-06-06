import { cn } from '@ever-teams/toolkit-ui';
import { LoaderCircle } from 'lucide-react';

export const SpinOverlayLoader = ({ className }: { className?: string }) => {
	return (
		<div
			className={cn(
				'w-full h-full flex justify-center items-center top-1/2 left-1/2 -translate-x-2/4 -translate-y-2/4 absolute',
				className
			)}
		>
			<LoaderCircle className="animate-spin" />
		</div>
	);
};
