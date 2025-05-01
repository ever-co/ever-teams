import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/core/components/ui/tooltip';

interface ActivityBarProps {
	percentage: string;
	title: string;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ percentage, title }) => {
	const percentageValue = Math.round(parseFloat(percentage));

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex gap-2 items-center">
						<div className="overflow-hidden w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
							<div
								className="h-full bg-blue-500 dark:bg-blue-600"
								style={{ width: `${percentageValue}%` }}
							/>
						</div>
						<span className="text-sm text-gray-600 dark:text-gray-300">{percentageValue}%</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>Activity: {title}</p>
					<p>Usage: {percentageValue}%</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};

ActivityBar.displayName = 'ActivityBar';
