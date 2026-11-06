import { FC } from 'react';
import { StatsCardSkeleton } from './stats-card-skeleton';

interface TeamStatsGridSkeletonProps {
	className?: string;
}

export const TeamStatsGridSkeleton: FC<TeamStatsGridSkeletonProps> = ({ className }) => {
	return <StatsCardSkeleton className={className} />;
};

export default TeamStatsGridSkeleton;
