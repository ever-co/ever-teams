import { ReactNode } from 'react';

export interface ActivityListHeader {
	title: string;
	width: string;
}

/**
 * The frame of the apps and visited sites lists: the column labels on a hairline, then the rows. It draws no
 * ring of its own because the list also renders inside a member card.
 */
export function ActivityListFrame({ headers, children }: { headers: ActivityListHeader[]; children: ReactNode }) {
	return (
		<div className="w-full hairline-y border-border">
			<header className="flex items-center px-4 h-10 text-xs font-medium hairline-b border-border text-muted-foreground">
				{headers.map((header, i) => (
					<div style={{ flexBasis: header.width }} key={i} className="pr-4 last:pr-0 last:text-right">
						{header.title}
					</div>
				))}
			</header>
			{children}
		</div>
	);
}
