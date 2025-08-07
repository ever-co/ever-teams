'use client';

import { Fragment, useMemo, useState } from 'react';
import { ResponsiveCalendar } from '@nivo/calendar';
import moment from 'moment';
import Separator from '@/core/components/common/separator';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { ActivityCalendarSkeleton } from '../common/skeleton/activity-calendar-skeleton';
import { useGetTimeLogsDailyReport } from '@/core/hooks/activities/time-logs/use-get-time-logs-daily-report';

export function ActivityCalendar() {
	const t = useTranslations();
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const { data: timeLogsDailyReport = [], isLoading: timerLogsDailyReportLoading } = useGetTimeLogsDailyReport({
		startDate: moment().year(selectedYear).startOf('year').toDate(),
		endDate: moment().year(selectedYear).endOf('year').toDate()
	});

	const filteredData = useMemo(() => {
		return timeLogsDailyReport
			.filter((item) => new Date(item.date).getFullYear() === selectedYear)
			.map((el) => ({
				value: Number((el.sum / 3600).toPrecision(2)),
				day: String(el.date)
			}));
	}, [timeLogsDailyReport, selectedYear]);

	const colorRange = useMemo(
		() => [
			'#9370DB', // 0-4 hours
			'#0000FF', // 4-10 hours
			'#FFA500', // 10-18 hours
			'#FF4500' // 18-24 hours
		],
		[]
	);

	return (
		<div className="flex flex-col space-y-4 w-full bg-white rounded-xl dark:bg-dark--theme">
			<div className="overflow-hidden p-4 w-full md:p-6">
				{timerLogsDailyReportLoading ? (
					<ActivityCalendarSkeleton />
				) : (
					<div className="flex flex-col space-y-4">
						<ActivityLegend selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
						<div className="relative w-full min-h-[400px] md:h-[450px] lg:h-[500px]">
							{/* @ts-ignore */}
							<ResponsiveCalendar
								tooltip={(value) => (
									<div className="z-50 p-3 bg-white rounded-lg shadow-lg dark:bg-dark--theme">
										<div className="text-sm font-medium text-gray-900 dark:text-gray-100">
											<strong>
												{t('timeActivity.HOURS_ON_DATE', {
													hours: value.value || t('common.NO'),
													date: moment(value.day).format('dddd, MMMM D, YYYY')
												})}
											</strong>
										</div>
									</div>
								)}
								data={filteredData}
								from={`${selectedYear}-01-01`}
								to={`${selectedYear}-12-31`}
								emptyColor="rgb(229, 231, 235)"
								colors={colorRange}
								yearSpacing={40}
								monthSpacing={20}
								monthBorderWidth={0}
								dayBorderWidth={0}
								daySpacing={2}
								monthLegendPosition="before"
								margin={{
									top: 20,
									right: 20,
									bottom: 20,
									left: 20
								}}
								theme={{
									background: 'transparent',
									text: {
										fontSize: 14,
										fill: '#9CA3AF', // gray-400
										fontWeight: 600,
										textTransform: 'capitalize'
									},
									tooltip: {
										container: {
											background: '#ffffff',
											color: '#374151',
											fontSize: '12px'
										}
									},
									labels: {
										text: {
											fontSize: 14,
											fontWeight: 'bold',
											fill: '#9CA3AF', // gray-400
											textTransform: 'capitalize'
										}
									}
								}}
								monthLegend={(year, month) => {
									const monthName = new Date(year, month).toLocaleString('en-US', {
										month: 'short'
									});
									return monthName;
								}}
								dayBorderColor="transparent"
								legends={[]}
								monthBorderColor="transparent"
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

interface ActivityLegendProps {
	selectedYear: number;
	setSelectedYear: (year: number) => void;
}

function ActivityLegend({ selectedYear, setSelectedYear }: ActivityLegendProps) {
	const t = useTranslations();

	const years = useMemo(() => {
		const currentYear = new Date().getFullYear();
		return Array.from({ length: 5 }, (_, i) => currentYear - i);
	}, []);

	const legendItems = useMemo(
		() => [
			{ color: '#9370DB', label: `0 - 4 ${t('common.HOURS')}` },
			{ color: '#0000FF', label: `4 - 10 ${t('common.HOURS')}` },
			{ color: '#FFA500', label: `10 - 18 ${t('common.HOURS')}` },
			{ color: '#FF4500', label: `18 - 24 ${t('common.HOURS')}` }
		],
		[t]
	);

	return (
		<div className="flex flex-col gap-4 justify-between p-3 bg-white rounded-lg shadow-sm sm:flex-row sm:items-center dark:bg-dark--theme-light">
			<div className="flex flex-wrap gap-3 items-center">
				<h3 className="text-base font-semibold whitespace-nowrap">{t('common.LEGEND')}</h3>
				{legendItems.map(({ color, label }, index) => (
					<Fragment key={color}>
						{index > 0 && <Separator orientation="vertical" className="h-4" />}
						<div className="flex gap-2 items-center">
							<span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
							<span className="text-sm whitespace-nowrap">{label}</span>
						</div>
					</Fragment>
				))}
			</div>
			<div className="flex gap-2 items-center ml-auto">
				<span className="text-sm font-medium whitespace-nowrap">YEAR</span>
				<Select
					defaultValue={selectedYear.toString()}
					onValueChange={(value) => setSelectedYear(Number(value))}
				>
					<SelectTrigger className="w-[100px]">
						<SelectValue placeholder="Select year" />
					</SelectTrigger>
					<SelectContent>
						{years.map((year) => (
							<SelectItem key={year} value={year.toString()}>
								{year}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
