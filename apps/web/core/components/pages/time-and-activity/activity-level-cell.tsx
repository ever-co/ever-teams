import ProgressBar from '../../duplicated-components/progress-bar';

interface ActivityLevelCellProps {
	activity: number;
	duration: number;
}

export function ActivityLevelCell({ activity, duration }: ActivityLevelCellProps) {
	if (duration === 0) {
		return (
			<div className="flex items-center gap-2 text-gray-400">
				<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
					<path
						d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
				<span>No activity</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<div className="flex-1 max-w-[120px]">
				<ProgressBar progress={activity} />
			</div>
			<span className="w-8 font-medium text-gray-900 dark:text-gray-100">{activity}%</span>
		</div>
	);
}
