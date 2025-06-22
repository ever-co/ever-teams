import { clsxm } from '@/core/lib/utils';
import { EverCard } from '../../common/ever-card';

const UnverifiedEmailSkeleton = ({ className }: { className?: string }) => {
	return (
		<EverCard
			shadow="bigger"
			className={clsxm(
				'w-full flex justify-between items-center',
				'border-[#00000008] border-[0.125rem] dark:border-[#26272C] dark:shadow-lg dark:bg-[#1B1D22]',
				'py-2 px-4 mb-2',
				className
			)}
		>
			{/* Email verification message */}
			<div className="flex items-center gap-1 flex-1">
				<div className="w-80 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Action buttons */}
			<div className="flex items-center gap-2">
				<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				<div className="w-16 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</div>

			{/* Close button */}
			<div className="w-5 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded ml-2" />
		</EverCard>
	);
};

export default UnverifiedEmailSkeleton;
