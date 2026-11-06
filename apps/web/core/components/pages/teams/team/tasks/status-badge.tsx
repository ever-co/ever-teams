import { cn } from '@/core/lib/helpers';
import React from 'react';

interface StatusBadgeProps {
	label: string;
	count: number;
	color: string;
}

/** One status of the page with how many tasks carry it; the colour comes from the status helper. */
const StatusBadge: React.FC<StatusBadgeProps> = ({ label, count, color }) => {
	return (
		<div
			className={cn(
				'inline-flex min-h-6 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium capitalize tabular-nums',
				color
			)}
		>
			{label} ({count})
		</div>
	);
};

export default StatusBadge;
