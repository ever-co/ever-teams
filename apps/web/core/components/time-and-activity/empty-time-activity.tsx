import { FC } from 'react';
import { AnimatedEmptyState } from '@/core/components/ui/empty-state';

export const EmptyTimeActivity: FC = () => {
	return (
		<div className="p-8 backdrop-blur-sm rounded-xl">
			<AnimatedEmptyState
				showBorder={false}
				title="No Activity Data"
				message={
					<>
						There is no activity data to display for the selected time period.{' '}
						<span className="text-primary/90 dark:text-primary-light/90">
							Start tracking your time to see the data here.
						</span>
					</>
				}
			/>
		</div>
	);
};
