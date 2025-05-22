import { Card } from '@/core/components/common/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { IActivityReport, IActivityReportGroupByDate } from '@/core/types/interfaces/-activity/IActivityReport';
import React from 'react';
import { ActivityRow, DateHeaderRow, ProjectHeaderRow } from './components';
import { EmptyState, LoadingSkeleton } from './states';
import { useTranslations } from 'next-intl';
import { usePagination } from '@/core/hooks/common/use-pagination';
import { groupActivitiesByProjectAndDate } from '@/core/lib/helpers/productivity-project';
import { Paginate } from '@/core/components/duplicated-components/_pagination';

interface ProductivityProjectTableProps {
	data?: IActivityReport[];
	isLoading?: boolean;
}

export const ProductivityProjectTable: React.FC<ProductivityProjectTableProps> = ({ data, isLoading }) => {
	const t = useTranslations();
	const reportData = data as IActivityReportGroupByDate[] | undefined;

	const { total, onPageChange, itemsPerPage, itemOffset, endOffset, setItemsPerPage, currentItems } =
		usePagination<IActivityReportGroupByDate>(reportData || []);

	if (isLoading) {
		return <LoadingSkeleton />;
	}

	if (!reportData || reportData.length === 0) {
		return <EmptyState t={t} />;
	}

	const projectGroups = groupActivitiesByProjectAndDate(currentItems);

	return (
		<Card className="bg-white rounded-md border border-gray-100 dark:border-gray-800 dark:bg-dark--theme-light min-h-[600px] w-full">
			<Table>
				<TableHeader className="bg-gray-50 dark:bg-dark--theme-light">
					<TableRow>
						<TableHead className="font-semibold">{t('common.DATE')}</TableHead>
						<TableHead className="font-semibold">{t('common.MEMBER')}</TableHead>
						<TableHead className="font-semibold">{t('common.APPLICATION')}</TableHead>
						<TableHead className="font-semibold">{t('common.TIME_SPENT')}</TableHead>
						<TableHead className="font-semibold">{t('common.PERCENT_USED')}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{Object.entries(projectGroups).map(([projectName, dateGroups]) => (
						<React.Fragment key={projectName}>
							<ProjectHeaderRow projectName={projectName} />
							{Object.entries(dateGroups).map(([date, { activities }]) => (
								<React.Fragment key={`${projectName}-${date}`}>
									<DateHeaderRow date={date} activities={activities} />
									{activities.map(({ employee, activity }, idx) => (
										<ActivityRow
											key={`${employee.id}-${idx}`}
											employee={employee}
											activity={activity}
										/>
									))}
								</React.Fragment>
							))}
						</React.Fragment>
					))}
				</TableBody>
			</Table>
			<div className="p-2 mt-4">
				<Paginate
					total={total}
					onPageChange={onPageChange}
					pageCount={1}
					itemsPerPage={itemsPerPage}
					itemOffset={itemOffset}
					endOffset={endOffset}
					setItemsPerPage={setItemsPerPage}
					className="pt-0"
				/>
			</div>
		</Card>
	);
};
