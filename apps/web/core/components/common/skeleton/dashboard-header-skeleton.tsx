import React from 'react';
import { Skeleton } from '../skeleton';

export const DashboardHeaderSkeleton = () => {
	return (
		<div className="flex justify-between items-center w-full">
			<div className="text-2xl font-semibold">
				<Skeleton className="w-24 h-6" />
			</div>
			<div className="flex gap-4 items-center">
				<Skeleton className="w-24 h-6" />
				<Skeleton className="w-24 h-6" />
				<Skeleton className="w-24 h-6" />
			</div>
		</div>
	);
};
