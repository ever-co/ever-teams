import { FC } from 'react';
import { Card } from '@/components/ui/card';
import Image from 'next/image';

export const EmptyTimeActivity: FC = () => {
	return (
		<Card className="bg-white dark:bg-dark--theme-light p-8">
			<div className="flex flex-col items-center justify-center gap-4 text-center">
				<div className="relative w-48 h-48">
					<Image
						src="/assets/illustrations/empty-time-activity.svg"
						alt="No activity data"
						fill
						className="object-contain"
					/>
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">No Activity Data</h3>
					<p className="text-[14px] text-[#71717A] dark:text-gray-400 max-w-sm">
						There is no activity data to display for the selected time period. Start tracking your time to
						see the data here.
					</p>
				</div>
			</div>
		</Card>
	);
};
