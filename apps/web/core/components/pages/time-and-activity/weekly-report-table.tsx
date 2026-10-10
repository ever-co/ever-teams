'use client';

import { useMemo, useState } from 'react';
import { addDays, addWeeks, endOfWeek, format, isSameWeek, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Avatar } from '@/core/components/duplicated-components/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/core/components/common/table';
import { Skeleton } from '@/core/components/common/skeleton';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { UseReportActivityProps } from '@/core/hooks/activities/use-activity-filters';
import { useActivityWeeklyReportQuery } from '@/core/hooks/activities/queries/use-activity-weekly-report-query';

// Weeks start on Monday, as in the date range picker of this page
const WEEK_OPTIONS = { weekStartsOn: 1 } as const;

// Same duration format as the daily table of this page
const formatDuration = (seconds: number) => {
	const { hours, minutes } = secondsToTime(seconds);
	return `${hours}:${minutes.toString().padStart(2, '0')}h`;
};

interface WeeklyReportTableProps {
	mergedProps: Required<UseReportActivityProps> | null;
	enabled: boolean;
}

export function WeeklyReportTable({ mergedProps, enabled }: WeeklyReportTableProps) {
	const t = useTranslations();
	const locale = useLocale();
	const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), WEEK_OPTIONS));
	const weekEnd = useMemo(() => endOfWeek(weekStart, WEEK_OPTIONS), [weekStart]);
	const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
	const isCurrentWeek = isSameWeek(weekStart, new Date(), WEEK_OPTIONS);

	const { weeklyReport, isLoading, isError, refetch } = useActivityWeeklyReportQuery({
		mergedProps,
		startDate: weekStart,
		endDate: weekEnd,
		enabled
	});

	const { dayFormat, weekFormat } = useMemo(
		() => ({
			dayFormat: new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric' }),
			weekFormat: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' })
		}),
		[locale]
	);

	const rows = useMemo(
		() =>
			weeklyReport
				.map(({ employee, dates }) => {
					const durations = days.map((day) => {
						const entry = dates[format(day, 'yyyy-MM-dd')];
						return entry ? entry.sum : 0;
					});
					return {
						id: employee.id,
						name: employee.fullName || employee.user?.name || t('timeActivity.UNNAMED_EMPLOYEE'),
						imageUrl: employee.user?.imageUrl,
						durations,
						total: durations.reduce((sum, duration) => sum + duration, 0)
					};
				})
				.sort((a, b) => a.name.localeCompare(b.name, locale)),
		[weeklyReport, days, locale, t]
	);

	const renderBody = () => {
		if (isError) {
			return (
				<AnimatedEmptyState
					title={t('timeActivity.WEEKLY_REPORT_ERROR')}
					message={t('timeActivity.WEEKLY_REPORT_ERROR_MESSAGE')}
					actionLabel={t('pages.unauthorized.TRY_AGAIN')}
					onAction={() => refetch()}
				/>
			);
		}

		if (!isLoading && rows.length === 0) {
			return (
				<AnimatedEmptyState
					title={t('timeActivity.NO_ACTIVITY_DATA')}
					message={t('timeActivity.NO_ACTIVITY_DATA_MESSAGE')}
				/>
			);
		}

		return (
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="border-b border-gray-200 dark:border-gray-600">
							<TableHead className="px-6 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
								{t('common.MEMBER')}
							</TableHead>
							{days.map((day) => (
								<TableHead
									key={day.toISOString()}
									className="px-4 text-sm text-right text-gray-500 whitespace-nowrap dark:text-gray-400"
								>
									{dayFormat.format(day)}
								</TableHead>
							))}
							<TableHead className="px-6 text-sm text-right text-gray-500 whitespace-nowrap dark:text-gray-400">
								{t('common.TOTAL')}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading
							? Array.from({ length: 3 }, (_, rowIndex) => (
									<TableRow key={rowIndex}>
										<TableCell className="px-6 py-4">
											<Skeleton className="w-32 h-4" />
										</TableCell>
										{Array.from({ length: days.length + 1 }, (_, cellIndex) => (
											<TableCell key={cellIndex} className="px-4 py-4">
												<Skeleton className="ml-auto w-12 h-4" />
											</TableCell>
										))}
									</TableRow>
								))
							: rows.map((row) => (
									<TableRow key={row.id}>
										<TableCell className="px-6 py-4">
											<div className="flex gap-3 items-center">
												<Avatar
													size={32}
													imageUrl={row.imageUrl}
													imageTitle={row.name}
													alt={row.name}
													className="shrink-0"
												/>
												<span className="font-medium text-gray-900 whitespace-nowrap dark:text-gray-100">
													{row.name}
												</span>
											</div>
										</TableCell>
										{row.durations.map((duration, index) => (
											<TableCell
												key={days[index].toISOString()}
												className={
													duration
														? 'px-4 py-4 text-right text-gray-900 whitespace-nowrap dark:text-gray-100'
														: 'px-4 py-4 text-right text-gray-400 whitespace-nowrap dark:text-gray-500'
												}
											>
												{formatDuration(duration)}
											</TableCell>
										))}
										<TableCell className="px-6 py-4 font-medium text-right text-gray-900 whitespace-nowrap dark:text-gray-100">
											{formatDuration(row.total)}
										</TableCell>
									</TableRow>
								))}
					</TableBody>
				</Table>
			</div>
		);
	};

	return (
		<div className="flex flex-col gap-4 p-3">
			<div className="flex gap-4 justify-between items-center">
				<Button
					variant="outline"
					size="icon"
					onClick={() => setWeekStart((current) => addWeeks(current, -1))}
					aria-label={t('timeActivity.PREVIOUS_WEEK')}
					title={t('timeActivity.PREVIOUS_WEEK')}
					className="dark:bg-dark--theme-light dark:border-[#2D2D2D]"
				>
					<ChevronLeft />
				</Button>
				<span className="text-base font-medium text-gray-900 dark:text-gray-100">
					{weekFormat.formatRange(weekStart, weekEnd)}
				</span>
				<Button
					variant="outline"
					size="icon"
					onClick={() => setWeekStart((current) => addWeeks(current, 1))}
					disabled={isCurrentWeek}
					aria-label={t('timeActivity.NEXT_WEEK')}
					title={t('timeActivity.NEXT_WEEK')}
					className="dark:bg-dark--theme-light dark:border-[#2D2D2D]"
				>
					<ChevronRight />
				</Button>
			</div>
			{renderBody()}
		</div>
	);
}
