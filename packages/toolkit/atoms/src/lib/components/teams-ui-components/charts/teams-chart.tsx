import { ChartType } from '../../teams-report/basic-report/teams-basic-report';
import { BarChart } from '../teams-ui-charts/bar-chart/bar-chart';
import { LineChart } from '../teams-ui-charts/line-chart/line-chart';
import { AreaChart } from '../teams-ui-charts/area-chart/area-chart';
import { TooltipChart } from '../teams-ui-charts/tooltip-chart/tooltip-chart';
import { RadarChart } from '../teams-ui-charts/radar-chart/radar-chart';
import { RadialChart } from '../teams-ui-charts/radial-chart/radial-chart';
import { useTeamsContext } from '@lib/context/teams-context';
import { SpinOverlayLoader } from '@components/loaders/spin-overlay-loader';
import { useTranslation } from 'react-i18next';
import { useReport } from '@hooks/useReport';
import { ChartLoader } from '@components/loaders/chart-loader';
import { BarChartHorizontal } from '../teams-ui-charts/bar-chart/bar-chart-horizontal';

const TeamsChart: React.FC<{ type: ChartType; className?: string }> = ({ type = 'bar', className }) => {
	const { appliedTheme } = useTeamsContext();

	const { chartData: data, report, loading: reportLoading, config } = useReport();

	const { t } = useTranslation(undefined, { keyPrefix: 'NO_DATA' });

	return (
		<div className={'min-w-[400px] relative ' + className}>
			{reportLoading && <SpinOverlayLoader />}

			{reportLoading ? (
				<ChartLoader type={type} />
			) : report && report[0] ? (
				<>
					{type == 'bar' && (
						<BarChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
					)}
					{type == 'bar-horizontal' && (
						<BarChartHorizontal
							color={appliedTheme.colors?.borderColor as string}
							config={config}
							data={data}
						/>
					)}
					{type == 'line' && (
						<LineChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
					)}
					{type == 'area' && (
						<AreaChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
					)}
					{type == 'tooltip' && (
						<TooltipChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
					)}
					{type == 'radar' && (
						<RadarChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
					)}
					{type == 'radial' && (
						<RadialChart color={appliedTheme.colors?.borderColor as string} config={config} data={data} />
					)}
				</>
			) : (
				<div className="w-full text-slate-400 dark:text-slate-600 flex top-1/2 left-1/2 justify-center items-center absolute -translate-x-2/4 -translate-y-2/4 ">
					{t('no_data_available')}
				</div>
			)}
		</div>
	);
};

TeamsChart.displayName = 'TeamsChart';

export { TeamsChart };
