import { clsxm } from '@/core/lib/utils';
import { EverCard } from '../../common/ever-card';

const TeamInvitationsSkeleton = ({ className }: { className?: string }) => {
	return (
		<div className={clsxm('mt-6', className)}>
			{/* Single invitation card skeleton */}
			<EverCard
				shadow="bigger"
				className={clsxm(
					'w-full mt-2 flex justify-between',
					'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]',
					'pt-2 pb-2'
				)}
			>
				{/* Invitation text */}
				<div className="mt-auto mb-auto">
					<div className="w-48 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				</div>

				{/* Action buttons */}
				<div className="flex flex-row gap-3 ml-auto mr-5 justify-items-end">
					<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />
					<div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-xl" />
				</div>

				{/* Close button */}
				<div className="w-5 h-5 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
			</EverCard>
		</div>
	);
};

export default TeamInvitationsSkeleton;
