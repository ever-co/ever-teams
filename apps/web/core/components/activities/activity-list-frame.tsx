import { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { VISITED_ROW_GRID, VISITED_ROW_METER } from '../pages/profile/visited-Item';

export interface ActivityListLabels {
	name: string;
	share: string;
	time: string;
}

/**
 * The frame of the apps and visited sites lists: the column labels on a hairline, then the rows. It draws no
 * ring of its own because the list also renders inside a member card. The labels sit on the rows' own grid, so
 * they follow the rows when the meter column is dropped on a narrow card.
 */
export function ActivityListFrame({ labels, children }: Readonly<{ labels: ActivityListLabels; children: ReactNode }>) {
	return (
		<div className="w-full hairline-y border-border">
			<header className="px-4 text-xs font-medium hairline-b border-border text-muted-foreground">
				<div className="@container">
					<div className={cn(VISITED_ROW_GRID, 'min-h-10')}>
						<span aria-hidden="true" />
						<span className="truncate">{labels.name}</span>
						<span className={cn('truncate', VISITED_ROW_METER)}>{labels.share}</span>
						<span className="truncate text-right">{labels.time}</span>
					</div>
				</div>
			</header>
			{children}
		</div>
	);
}
