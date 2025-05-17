import React from 'react';

interface ProgressBarProps {
	progress: number;
	color?: string;
	isLoading?: boolean;
	size?: 'sm' | 'md' | 'lg';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
	progress,
	color = 'bg-[#0088CC]',
	isLoading = false,
	size = 'md'
}) => {
	const progressValue = isLoading ? 0 : Math.min(Math.max(progress, 0), 100);

	const heightClass = {
		sm: 'h-1.5',
		md: 'h-2',
		lg: 'h-3'
	}[size];

	return (
		<div className="flex-1">
			<div className={`w-full ${heightClass} bg-[#E4E4E7] rounded-full overflow-hidden`}>
				<div
					className={`h-full ${color}`}
					style={{
						width: `${progressValue}%`,
						transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)'
					}}
				/>
			</div>
		</div>
	);
};

export default ProgressBar;
