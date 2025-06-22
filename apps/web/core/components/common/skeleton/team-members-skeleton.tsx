import { IssuesView } from '@/core/constants/config/constants';
import UserTeamCardSkeletonCard from '../../teams/user-team-card-skeleton';
import InviteUserTeamCardSkeleton from '../../teams/invite-team-card-skeleton';
import { Container } from '@/core/components';

interface TeamMembersSkeletonProps {
	view?: IssuesView;
	className?: string;
	fullWidth?: boolean;
}
const TeamMembersSkeleton = ({ view = IssuesView.CARDS, className, fullWidth = true }: TeamMembersSkeletonProps) => {
	// Note: Removed useAtomValue hook to prevent rendering issues in Suspense fallbacks

	const renderCardView = () => (
		<div className="flex flex-col gap-4">
			{Array.from({ length: 4 }, (_, index) => (
				<UserTeamCardSkeletonCard key={index} />
			))}
			<InviteUserTeamCardSkeleton />
		</div>
	);

	const renderTableView = () => (
		<div className="w-full">
			{/* Table header */}
			<div className="grid grid-cols-6 gap-4 p-4 border-b dark:border-gray-700">
				{Array.from({ length: 6 }, (_, index) => (
					<div key={index} className="w-20 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
				))}
			</div>

			{/* Table rows */}
			{Array.from({ length: 5 }, (_, rowIndex) => (
				<div key={rowIndex} className="grid grid-cols-6 gap-4 p-4 border-b dark:border-gray-700">
					{Array.from({ length: 6 }, (_, colIndex) => (
						<div
							key={colIndex}
							className="w-full h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded"
						/>
					))}
				</div>
			))}
		</div>
	);

	const renderBlockView = () => (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: 6 }, (_, index) => (
				<div key={index} className="p-4 rounded-lg border dark:border-gray-700">
					<div className="flex gap-3 items-center mb-3">
						<div className="w-10 h-10 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded-full" />
						<div className="flex-1">
							<div className="w-24 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded mb-2" />
							<div className="w-16 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						</div>
					</div>
					<div className="space-y-2">
						<div className="w-full h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
						<div className="w-3/4 h-3 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
					</div>
				</div>
			))}
		</div>
	);

	const renderMap = {
		[IssuesView.TABLE]: renderTableView,
		[IssuesView.BLOCKS]: renderBlockView,
		[IssuesView.CARDS]: renderCardView
	};

	const renderContent = renderMap[view as keyof typeof renderMap] || renderCardView;

	return (
		<Container fullWidth={fullWidth} className={className}>
			{renderContent()}
		</Container>
	);
};

export default TeamMembersSkeleton;
