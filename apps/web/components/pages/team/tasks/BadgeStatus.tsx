import React from 'react';

interface StatusBadgeProps {
	label: string;
	count: number;
	color: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ label, count, color }) => {
	return (
		<div className={`gap-0.5 self-stretch px-3.5 py-1 ${color} min-h-[26px] rounded-[40px]`}>
			{label} ({count})
		</div>
	);
};

export default StatusBadge;
