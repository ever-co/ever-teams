'use client';

import React, { useMemo } from 'react';
import { Data } from 'clarity-decode';
import { MousePointer, Target, Grid, BarChart3, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ever-teams/toolkit-ui';

import { calculateClickInsights, IClickInsight, ElementClickData } from '../../../utils/tracking-utils';

interface ClickInsightProps {
	decodedPayloads: Data.DecodedPayload[];
	className?: string;
	showElementDetails?: boolean;
}

interface ClickMetricCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ReactNode;
	className?: string;
}

interface ElementListProps {
	elements: ElementClickData[];
	totalClicks: number;
}

const ClickMetricCard: React.FC<ClickMetricCardProps> = ({ title, value, subtitle, icon, className }) => {
	return (
		<div
			className={cn(
				'bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-xs',
				className
			)}
		>
			<div className="flex items-center gap-2 mb-2">
				<div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">{icon}</div>
				<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h3>
			</div>
			<div className="space-y-1">
				<div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
				{subtitle && <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
			</div>
		</div>
	);
};

const ElementList: React.FC<ElementListProps> = ({ elements }) => {
	const { t } = useTranslation(undefined, { keyPrefix: 'CLICK_INSIGHT' });

	if (!elements.length) {
		return (
			<div className="text-center py-8 text-gray-500 dark:text-gray-400">
				<Target size={32} className="mx-auto mb-2 opacity-50" />
				<p className="text-sm">{t('elements.no_data')}</p>
			</div>
		);
	}

	return (
		<div className="space-y-2 custom-scroll overflow-y-scroll max-h-72">
			{elements.slice(0, 8).map((element, index) => (
				<div
					key={element.elementId}
					className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
							{index + 1}
						</div>
						<div>
							<div className="text-sm font-medium text-gray-900 dark:text-white">
								{t('elements.element')} {element.elementId}
							</div>
							<div className="text-xs text-gray-500 dark:text-gray-400">
								{element.percentage.toFixed(1)}
								{t('elements.percentage_of_clicks')}
							</div>
						</div>
					</div>
					<div className="text-right">
						<div className="text-sm font-semibold text-gray-900 dark:text-white">{element.clickCount}</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">{t('elements.clicks')}</div>
					</div>
				</div>
			))}
		</div>
	);
};

const ClickInsight: React.FC<ClickInsightProps> = ({
	decodedPayloads: activePayloads,
	className,
	showElementDetails = true
}) => {
	const { t } = useTranslation(undefined, { keyPrefix: 'CLICK_INSIGHT' });
	// Use provided payloads directly (filtering is handled at a higher level)

	// Calculate click analytics
	const clickAnalytics: IClickInsight = useMemo(() => {
		if (!activePayloads?.length) {
			return {
				totalClicks: 0,
				clickRate: 0,
				clickDensity: 0,
				uniqueElements: 0,
				averageClicksPerElement: 0,
				topClickedElements: [],
				clickDistribution: {
					topQuadrant: 0,
					middleQuadrant: 0,
					bottomQuadrant: 0,
					leftHalf: 0,
					rightHalf: 0
				}
			};
		}

		return calculateClickInsights(activePayloads);
	}, [activePayloads]);

	// Format values for display
	const formattedMetrics = useMemo(() => {
		return {
			totalClicks: clickAnalytics.totalClicks.toLocaleString(),
			clickRate: clickAnalytics.clickRate.toFixed(1),
			clickDensity: clickAnalytics.clickDensity.toFixed(2),
			uniqueElements: clickAnalytics.uniqueElements.toLocaleString(),
			averageClicksPerElement: clickAnalytics.averageClicksPerElement.toFixed(1)
		};
	}, [clickAnalytics]);

	// Calculate distribution percentages
	const distributionPercentages = useMemo(() => {
		const total = clickAnalytics.totalClicks;
		if (total === 0) return { top: 0, middle: 0, bottom: 0, left: 0, right: 0 };

		return {
			top: ((clickAnalytics.clickDistribution.topQuadrant / total) * 100).toFixed(1),
			middle: ((clickAnalytics.clickDistribution.middleQuadrant / total) * 100).toFixed(1),
			bottom: ((clickAnalytics.clickDistribution.bottomQuadrant / total) * 100).toFixed(1),
			left: ((clickAnalytics.clickDistribution.leftHalf / total) * 100).toFixed(1),
			right: ((clickAnalytics.clickDistribution.rightHalf / total) * 100).toFixed(1)
		};
	}, [clickAnalytics]);

	return (
		<div className={cn('space-y-6', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h2>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
				</div>
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<MousePointer size={14} />
					<span>
						{formattedMetrics.totalClicks} {t('total_clicks')}
					</span>
				</div>
			</div>

			{/* Main Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<ClickMetricCard
					title={t('metrics.total_clicks')}
					value={formattedMetrics.totalClicks}
					subtitle={t('metrics.subtitles.user_interactions')}
					icon={<MousePointer size={16} className="text-blue-600 dark:text-blue-400" />}
				/>

				<ClickMetricCard
					title={t('metrics.click_rate')}
					value={`${formattedMetrics.clickRate}/min`}
					subtitle={t('metrics.subtitles.clicks_per_minute')}
					icon={<TrendingUp size={16} className="text-green-600 dark:text-green-400" />}
				/>

				<ClickMetricCard
					title={t('metrics.click_density')}
					value={formattedMetrics.clickDensity}
					subtitle={t('metrics.subtitles.per_1000px')}
					icon={<Grid size={16} className="text-purple-600 dark:text-purple-400" />}
				/>

				<ClickMetricCard
					title={t('metrics.unique_elements')}
					value={formattedMetrics.uniqueElements}
					subtitle={`${formattedMetrics.averageClicksPerElement} ${t('metrics.subtitles.avg_clicks_per_element')}`}
					icon={<Target size={16} className="text-orange-600 dark:text-orange-400" />}
				/>
			</div>

			{/* Distribution Analysis */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Spatial Distribution */}
				<div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
						<BarChart3 size={18} />
						{t('distribution.title')}
					</h3>
					<div className="space-y-3">
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600 dark:text-gray-400">{t('distribution.top_25')}</span>
							<div className="flex items-center gap-2">
								<div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										className="bg-blue-500 h-2 rounded-full"
										style={{ width: `${distributionPercentages.top}%` }}
									/>
								</div>
								<span className="text-sm font-medium text-gray-900 dark:text-white w-12">
									{distributionPercentages.top}%
								</span>
							</div>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600 dark:text-gray-400">
								{t('distribution.middle_50')}
							</span>
							<div className="flex items-center gap-2">
								<div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										className="bg-green-500 h-2 rounded-full"
										style={{ width: `${distributionPercentages.middle}%` }}
									/>
								</div>
								<span className="text-sm font-medium text-gray-900 dark:text-white w-12">
									{distributionPercentages.middle}%
								</span>
							</div>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-sm text-gray-600 dark:text-gray-400">
								{t('distribution.bottom_25')}
							</span>
							<div className="flex items-center gap-2">
								<div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
									<div
										className="bg-orange-500 h-2 rounded-full"
										style={{ width: `${distributionPercentages.bottom}%` }}
									/>
								</div>
								<span className="text-sm font-medium text-gray-900 dark:text-white w-12">
									{distributionPercentages.bottom}%
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Top Clicked Elements */}
				{showElementDetails && (
					<div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-4">
						<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
							<Target size={18} />
							{t('elements.title')}
						</h3>
						<ElementList
							elements={clickAnalytics.topClickedElements}
							totalClicks={clickAnalytics.totalClicks}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default ClickInsight;
export { ClickInsight };
export type { ClickInsightProps };
