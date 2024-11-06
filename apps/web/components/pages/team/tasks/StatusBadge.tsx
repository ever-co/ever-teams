import { cn } from '@/lib/utils';
import React from 'react';

interface StatusBadgeProps {
	label: string;
	count: number;
	color: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, count, color }) => {
	return (
		<div
			className={cn(
				'gap-0.5 self-stretch py-1.5 justify-center md:px-3 px-2 flex items-center capitalize text-sm relative min-h-[26px] rounded-[40px]',
				color
			)}
		>
			{label} ({count})
		</div>
	);
};

export default StatusBadge;
