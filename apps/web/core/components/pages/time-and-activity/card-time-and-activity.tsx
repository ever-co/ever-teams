import React from 'react';
import { Loader2 } from 'lucide-react';
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
		<div className="p-6 bg-white rounded-xl shadow-sm dark:bg-dark--theme-light">
			<div className="flex flex-col">
				<span className="mb-2 text-sm text-gray-500">{title}</span>
				<div className="flex items-start">
					{isLoading ? (
						<Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
					) : (
						<span className="text-[32px] leading-[38px] font-semibold text-gray-900 dark:text-white">
							{value}
						</span>
					)}
				</div>
				{showProgress && (
					<div className="w-28">
						<ProgressBar progress={progress} color={progressColor} isLoading={isLoading} />
					</div>
				)}
			</div>
		</div>
	);
};

export default CardTimeAndActivity;
