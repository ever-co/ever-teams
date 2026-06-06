'use client';

import React, { useMemo } from 'react';
import { Data } from 'clarity-decode';
import { Clock, Activity, Target, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ever-teams/toolkit-ui';

import { calculateSessionMetrics, SessionMetrics } from '../../../utils/tracking-utils';
import { formatDuration } from '../../../utils/tracking-utils';

interface SessionInsightProps {
	decodedPayloads: Data.DecodedPayload[];
	className?: string;
}

interface MetricCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ReactNode;
	trend?: {
		value: number;
		isPositive: boolean;
	};
	className?: string;
}

// Add these utility functions above the SessionInsight component
const getActivityLevel = (interactionRate: number, t: any): string => {
	if (interactionRate > 5) return t('insights.levels.very_active');
	if (interactionRate > 2) return t('insights.levels.active');
	if (interactionRate > 0.5) return t('insights.levels.moderate');
	return t('insights.levels.low');
};

const getSessionQuality = (engagementScore: number, t: any): string => {
	if (engagementScore > 70) return t('insights.levels.excellent');
	if (engagementScore > 40) return t('insights.levels.good');
	return t('insights.levels.needs_improvement');
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, trend, className }) => {
	return (
		<div
			className={cn(
				'bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-xs',
				className
			)}
		>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">{icon}</div>
					<h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</h3>
				</div>
				{trend && (
					<div
						className={cn(
							'flex items-center gap-1 text-xs px-2 py-1 rounded-full',
							trend.isPositive
								? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
								: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
						)}
					>
						<TrendingUp size={12} className={cn(trend.isPositive ? '' : 'rotate-180')} />
						{Math.abs(trend.value)}%
					</div>
				)}
			</div>
			<div className="space-y-1">
				<div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
				{subtitle && <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
			</div>
		</div>
	);
};

const SessionInsight: React.FC<SessionInsightProps> = ({ decodedPayloads, className }) => {
	const { t } = useTranslation(undefined, { keyPrefix: 'SESSION_INSIGHT' });
	// Use provided payloads directly (filtering is handled at a higher level)
	const activePayloads = decodedPayloads;

	// Calculate session metrics
	const sessionMetrics: SessionMetrics = useMemo(() => {
		if (!activePayloads?.length) {
			return {
				totalDuration: 0,
				activeDuration: 0,
				idleTime: 0,
				engagementScore: 0,
				interactionRate: 0,
				eventCount: 0
			};
		}

		return calculateSessionMetrics(activePayloads);
	}, [activePayloads]);

	// Format values for display
	const formattedMetrics = useMemo(() => {
		return {
			totalDuration: formatDuration(sessionMetrics.totalDuration),
			activeDuration: formatDuration(sessionMetrics.activeDuration),
			idleTime: formatDuration(sessionMetrics.idleTime),
			engagementScore: `${sessionMetrics.engagementScore}%`,
			interactionRate: sessionMetrics.interactionRate.toFixed(1),
			eventCount: sessionMetrics.eventCount.toLocaleString(),
			activePercentage:
				sessionMetrics.totalDuration > 0
					? ((sessionMetrics.activeDuration / sessionMetrics.totalDuration) * 100).toFixed(1)
					: '0'
		};
	}, [sessionMetrics]);

	// Calculate engagement level for color coding
	const engagementLevel = useMemo(() => {
		if (sessionMetrics.engagementScore >= 70) return 'high';
		if (sessionMetrics.engagementScore >= 40) return 'medium';
		return 'low';
	}, [sessionMetrics.engagementScore]);

	const engagementColors = {
		high: 'text-green-600 dark:text-green-400',
		medium: 'text-yellow-600 dark:text-yellow-400',
		low: 'text-red-600 dark:text-red-400'
	};

	return (
		<div className={cn('space-y-6', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('title')}</h2>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('description')}</p>
				</div>
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
					<Users size={14} />
					<span>
						{activePayloads.length} {activePayloads.length === 1 ? t('payloads') : t('payloads_plural')}
					</span>
				</div>
			</div>

			{/* Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{/* Total Duration */}
				<MetricCard
					title={t('metrics.total_duration')}
					value={formattedMetrics.totalDuration}
					subtitle={t('metrics.subtitles.complete_session_length')}
					icon={<Clock size={16} className="text-blue-600 dark:text-blue-400" />}
				/>

				{/* Active Time */}
				<MetricCard
					title={t('metrics.active_time')}
					value={formattedMetrics.activeDuration}
					subtitle={`${formattedMetrics.activePercentage}% ${t('metrics.subtitles.of_total_session')}`}
					icon={<Activity size={16} className="text-green-600 dark:text-green-400" />}
				/>

				{/* Engagement Score */}
				<MetricCard
					title={t('metrics.engagement_score')}
					value={formattedMetrics.engagementScore}
					subtitle={`${engagementLevel.charAt(0).toUpperCase() + engagementLevel.slice(1)} ${t('metrics.subtitles.engagement')}`}
					icon={<Target size={16} className={engagementColors[engagementLevel]} />}
				/>

				{/* Interaction Rate */}
				<MetricCard
					title={t('metrics.interaction_rate')}
					value={`${formattedMetrics.interactionRate}/min`}
					subtitle={t('metrics.subtitles.interactions_per_minute')}
					icon={<TrendingUp size={16} className="text-purple-600 dark:text-purple-400" />}
				/>

				{/* Total Events */}
				<MetricCard
					title={t('metrics.total_events')}
					value={formattedMetrics.eventCount}
					subtitle={t('metrics.subtitles.user_interactions_recorded')}
					icon={<Activity size={16} className="text-orange-600 dark:text-orange-400" />}
				/>

				{/* Idle Time */}
				<MetricCard
					title={t('metrics.idle_time')}
					value={formattedMetrics.idleTime}
					subtitle={t('metrics.subtitles.time_without_interactions')}
					icon={<Clock size={16} className="text-gray-600 dark:text-gray-400" />}
				/>
			</div>

			{/* Summary Insights */}
			<div className="bg-gray-50 dark:bg-black rounded-lg p-4 border border-gray-200 dark:border-gray-700">
				<h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t('insights.title')}</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
					<div>
						<span className="font-medium">{t('insights.activity_level')}</span>{' '}
						{getActivityLevel(sessionMetrics.interactionRate, t)}
					</div>
					<div>
						<span className="font-medium">{t('insights.session_quality')}</span>{' '}
						{getSessionQuality(sessionMetrics.engagementScore, t)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SessionInsight;
export { SessionInsight };
export type { SessionInsightProps };
