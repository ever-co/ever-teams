import { ReactNode } from 'react';

export function DashboardReportFlow({ chart, table }: { chart?: ReactNode; table: ReactNode }) {
	return (
		<div data-testid="dashboard-report-flow" className="flex w-full flex-col gap-4">
			{chart}
			{table}
		</div>
	);
}
