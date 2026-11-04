import { clsxm } from '@/core/lib/utils';

interface ModalSkeletonProps {
	className?: string;
	size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function ModalSkeleton({ className, size = 'md' }: ModalSkeletonProps) {
	const sizeClasses = {
		sm: 'w-96 h-64',
		md: 'w-[500px] h-96',
		lg: 'w-[600px] h-[500px]',
		xl: 'w-[800px] h-[600px]'
	};

	return (
		<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
			<div
				className={clsxm(
					'bg-card rounded-2xl hairline-ring ring-border shadow-xl shadow-black/6.5 p-6',
					sizeClasses[size],
					className
				)}
			>
				{/* Modal header skeleton */}
				<div className="flex items-center justify-between mb-4">
					<div className="h-6 w-48 bg-foreground/5 animate-pulse rounded-md" />
					<div className="size-8 bg-foreground/5 animate-pulse rounded-md" />
				</div>

				{/* Modal content skeleton */}
				<div className="space-y-4 flex-1">
					<div className="h-4 w-full bg-foreground/5 animate-pulse rounded-md" />
					<div className="h-4 w-3/4 bg-foreground/5 animate-pulse rounded-md" />
					<div className="h-32 w-full bg-foreground/5 animate-pulse rounded-md" />
					<div className="h-4 w-1/2 bg-foreground/5 animate-pulse rounded-md" />
				</div>

				{/* Modal footer skeleton */}
				<div className="flex justify-end space-x-2 mt-6">
					<div className="h-9 w-20 bg-foreground/5 animate-pulse rounded-md" />
					<div className="h-9 w-24 bg-foreground/5 animate-pulse rounded-md" />
				</div>
			</div>
		</div>
	);
}
