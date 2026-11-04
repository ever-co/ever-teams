import { clsxm } from '@/core/lib/utils';
import { EverCard } from '../../common/ever-card';

const TeamInvitationsSkeleton = ({ className }: { className?: string }) => {
	return (
		<div className={clsxm('mt-6', className)}>
			{/* Single invitation card skeleton */}
			<EverCard shadow="bigger" className={clsxm('w-full mt-2 flex justify-between', 'pt-2 pb-2')}>
				{/* Invitation text */}
				<div className="mt-auto mb-auto">
					<div className="w-48 h-4 bg-foreground/5 animate-pulse rounded-md" />
				</div>

				{/* Action buttons */}
				<div className="flex flex-row gap-3 ml-auto mr-5 justify-items-end">
					<div className="w-20 h-9 bg-foreground/5 animate-pulse rounded-md" />
					<div className="w-20 h-9 bg-foreground/5 animate-pulse rounded-md" />
				</div>

				{/* Close button */}
				<div className="w-5 h-5 bg-foreground/5 animate-pulse rounded-sm" />
			</EverCard>
		</div>
	);
};

export default TeamInvitationsSkeleton;
