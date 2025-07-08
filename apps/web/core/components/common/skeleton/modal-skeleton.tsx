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
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className={clsxm(
				'bg-white dark:bg-[#1B1D22] rounded-lg border border-[#0000001A] dark:border-[#26272C] p-6',
				sizeClasses[size],
				className
			)}>
				{/* Modal header skeleton */}
				<div className="flex items-center justify-between mb-4">
					<div className="h-6 w-48 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="h-6 w-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Modal content skeleton */}
				<div className="space-y-4 flex-1">
					<div className="h-4 w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="h-4 w-3/4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="h-32 w-full bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="h-4 w-1/2 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Modal footer skeleton */}
				<div className="flex justify-end space-x-2 mt-6">
					<div className="h-10 w-20 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					<div className="h-10 w-24 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>
			</div>
		</div>
	);
}
