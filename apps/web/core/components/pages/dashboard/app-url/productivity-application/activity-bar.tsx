import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/core/components/common/tooltip';

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
						<div className="overflow-hidden w-full h-1.5 rounded-full bg-foreground/10">
							<div className="h-full rounded-full bg-primary" style={{ width: `${percentageValue}%` }} />
						</div>
						<span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
							{percentageValue}%
						</span>
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
