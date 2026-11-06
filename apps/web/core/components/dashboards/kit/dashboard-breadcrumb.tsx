import type { ReactNode } from 'react';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';

export interface DashboardCrumb {
	title: string;
	href: string;
}

/** The top bar's trail for a report: the page icon, then links that each lead to a real page. */
export function DashboardBreadcrumb({ icon, paths }: Readonly<{ icon: ReactNode; paths: DashboardCrumb[] }>) {
	return (
		<div className="flex min-w-0 items-center gap-2 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground">
			{icon}
			<Breadcrumb paths={paths} className="min-w-0 text-sm" />
		</div>
	);
}
