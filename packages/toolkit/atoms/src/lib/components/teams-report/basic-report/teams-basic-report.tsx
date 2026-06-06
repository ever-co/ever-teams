/** @jsxImportSource theme-ui */

import { cva, VariantProps } from 'class-variance-authority';
import { Card, cn } from '@ever-teams/toolkit-ui';
import { useTranslation } from 'react-i18next';
import { useTeamsContext } from '@lib/context/teams-context';
import { TeamsActiveEmployeeSelector } from '@components/teams-ui-components/inputs/teams-active-employee-selector';
import { TeamsReportDatesRangePicker } from '@components/teams-ui-components/inputs/teams-report-dates-range-picker';
import { TeamsReportDisplayer } from '@components/teams-ui-components/report-displayer';
import { BarChart } from '@components/teams-ui-components/teams-ui-charts/bar-chart/bar-chart';
import { LineChart } from '@components/teams-ui-components/teams-ui-charts/line-chart/line-chart';
import { AreaChart } from '@components/teams-ui-components/teams-ui-charts/area-chart/area-chart';
import { TooltipChart } from '@components/teams-ui-components/teams-ui-charts/tooltip-chart/tooltip-chart';
import { RadialChart } from '@components/teams-ui-components/teams-ui-charts/radial-chart/radial-chart';
import { RadarChart } from '@components/teams-ui-components/teams-ui-charts/radar-chart/radar-chart';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { BarChartHorizontal } from '@components/teams-ui-components/teams-ui-charts/bar-chart/bar-chart-horizontal';
import { useReport } from '@hooks/useReport';
import { ChartLoader } from '@components/loaders/chart-loader';

export type ChartType = 'bar' | 'bar-horizontal' | 'area' | 'pie' | 'line' | 'radar' | 'radial' | 'tooltip';
interface ITeamsBasicReportProps extends VariantProps<typeof teamsBasicReportVariants> {
	type?: ChartType;
	className?: string;
	draggable?: boolean;
}

const teamsBasicReportVariants = cva(
	'dark:text-white h-[600px] flex p-5 flex-col justify-between gap-3 rounded-xl  bg-white dark:bg-black shadow-2xl dark:shadow-white/10 ',
	{
		variants: {
			variant: {
				default: '',
				bordered: 'border-2 border-secondaryColor'
			},
			size: {
				default: 'w-[700px]',
				sm: 'w-[600px] text-sm p-4',
				lg: 'min-w-[1200px] w-full px-10 max-w-screen'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

/**
 * @description
 * A component that displays worked time of connected employee in the current week by default but user can change dates range,
 * If an admin is connected, it displays worked time of employees in selected team.
 *
 * @param {ITeamsBasicReportProps} props
 * @param {ChartType} [props.type='bar'] - The type of the chart to display
 * @param {string} [props.variant='default'] - The variant of the component
 * @param {string} [props.className] - The className of the component
 * @param {boolean} [props.draggable=false] - Whether the component is draggable or not
 * @param {string} [props.size='default'] - The size of the component
 *
 * @return {ReactElement} The component
 */
const TeamsBasicReport = ({
	type = 'bar-horizontal',
	variant,
	className,
	draggable = false,
	size
}: ITeamsBasicReportProps) => {
	const { appliedTheme } = useTeamsContext();

	const { chartData: data, report, loading: reportLoading, config } = useReport();

	const { t } = useTranslation();

	return (
		<Card
			className={cn(teamsBasicReportVariants({ variant, size, className }), ' relative')}
			sx={{ borderColor: 'borderColor' }}
		>
			{draggable && <div className="handle w-full h-8 absolute top-0 left-0 cursor-grab"></div>}

			<div className=" flex flex-col gap-2 ">
				<div className=" flex w-full justify-between items-center">
					<h1 className="text-lg font-medium">{t('REPORT.title')}</h1>
					<div className=" flex justify-end items-center gap-2 ">
						<TeamsActiveEmployeeSelector label="Select employee" />
						<TeamsReportDatesRangePicker />
					</div>
				</div>
				<div className="flex gap-3 overflow-scroll custom-scroll pb-2">
					{report && report[0] ? (
						report.map((elt, index) => {
							return (
								<TeamsReportDisplayer
									workedTime={elt.sum}
									label={elt.employee.fullName.split(' ')[0]}
									maxWorkHours={8}
									key={index}
									loading={reportLoading}
								/>
							);
						})
					) : (
						<TeamsReportDisplayer
							workedTime={0}
							maxWorkHours={8}
							label={t('COMMON.time') + ' ' + t('COMMON.worked')}
							loading={reportLoading}
						/>
					)}
				</div>
			</div>

			<>
				{reportLoading ? (
					<ChartLoader type={type} />
				) : !(report && report[0]) ? (
					<div className="w-full text-slate-400 dark:text-slate-600 flex top-1/2 left-1/2 justify-center items-center absolute -translate-x-2/4 -translate-y-2/4 ">
						{t('NO_DATA.no_data_available')}
					</div>
				) : (
					<>
						{type == 'bar-horizontal' && (
							<BarChartHorizontal
								color={appliedTheme.colors?.borderColor as string}
								config={config}
								data={data}
							/>
						)}
						{type == 'bar' && (
							<BarChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
						)}
						{type == 'line' && (
							<LineChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
						)}
						{type == 'area' && (
							<AreaChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
						)}
						{type == 'tooltip' && (
							<TooltipChart
								color={appliedTheme.colors?.borderColor as string}
								config={config}
								data={data}
							/>
						)}
						{type == 'radial' && (
							<RadialChart
								color={appliedTheme.colors?.borderColor as string}
								config={config}
								data={data}
							/>
						)}
						{type == 'radar' && (
							<RadarChart
								color={appliedTheme.colors?.borderColor as string}
								config={config}
								data={data}
							/>
						)}
						{type == 'pie' && (
							// <PieChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
							<div className="flex justify-center items-center h-[300px]">
								Pie Chart Under development
							</div>
						)}
					</>
				)}
			</>

			<TeamsTimerFooter />
		</Card>
	);
};

export { TeamsBasicReport, teamsBasicReportVariants };
