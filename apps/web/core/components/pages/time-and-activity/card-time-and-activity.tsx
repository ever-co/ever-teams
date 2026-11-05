import React from 'react';
import { Spinner } from '@/core/components/icons';
import ProgressBar from '../../duplicated-components/progress-bar';

interface StatisticCardProps {
	title: string;
	value: string | number;
	showProgress?: boolean;
	progress?: number;
	progressColor?: string;
	isLoading?: boolean;
}

const CardTimeAndActivity: React.FC<StatisticCardProps> = ({
	title,
	value,
	showProgress = false,
	progress = 0,
	progressColor = 'bg-primary',
	isLoading = false
}) => {
	return (
		<div className="flex min-w-0 flex-col gap-1 p-4">
			<span className="truncate text-xs text-muted-foreground">{title}</span>
			<div className="flex h-8 items-center">
				{isLoading ? (
					<Spinner className="size-5 animate-spin text-muted-foreground" />
				) : (
					<span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
				)}
			</div>
			{showProgress && (
				<div className="w-28">
					<ProgressBar progress={progress} color={progressColor} isLoading={isLoading} size="sm" />
				</div>
			)}
		</div>
	);
};

export default CardTimeAndActivity;
