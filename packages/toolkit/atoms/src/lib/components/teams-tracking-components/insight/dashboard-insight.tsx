'use client';

import React, { useState } from 'react';
import { Data } from 'clarity-decode';
import { BarChart3, MousePointer, Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@ever-teams/toolkit-ui';

import SessionAnalyticsDashboard from './session-insight';
import ClickInsight from './click-insight';

interface DashboardInsightProps {
	decodedPayloads: Data.DecodedPayload[];
	className?: string;
	defaultExpanded?: boolean;
	showSessionAnalytics?: boolean;
	showClickAnalytics?: boolean;
}

interface AnalyticsSectionProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	defaultExpanded?: boolean;
	className?: string;
}

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
	title,
	icon,
	children,
	defaultExpanded = true,
	className
}) => {
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	return (
		<div className={cn('border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', className)}>
			<button
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
			>
				<div className="flex items-center gap-3">
					<div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-xs">{icon}</div>
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-xs text-gray-500 dark:text-gray-400">
						{isExpanded ? 'Collapse' : 'Expand'}
					</span>
					{isExpanded ? (
						<ChevronUp size={16} className="text-gray-500 dark:text-gray-400" />
					) : (
						<ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
					)}
				</div>
			</button>

			{isExpanded && <div className="p-6 bg-white dark:bg-black">{children}</div>}
		</div>
	);
};

const DashboardInsight: React.FC<DashboardInsightProps> = ({
	decodedPayloads,
	className,
	defaultExpanded = true,
	showSessionAnalytics = true,
	showClickAnalytics = true
}) => {
	// Use provided payloads directly (filtering is handled at a higher level)
	const activePayloads = decodedPayloads;

	// Quick stats for header
	const quickStats = React.useMemo(() => {
		if (!activePayloads?.length) {
			return { payloads: 0, sessions: 0, hasData: false };
		}

		// Count unique sessions
		const sessionIds = new Set(activePayloads.map((payload) => payload.envelope?.sessionId).filter(Boolean));

		return {
			payloads: activePayloads.length,
			sessions: sessionIds.size,
			hasData: true
		};
	}, [activePayloads]);

	if (!quickStats.hasData) {
		return (
			<div
				className={cn(
					'bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-8',
					className
				)}
			>
				<div className="text-center text-gray-500 dark:text-gray-400">
					<BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
					<h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
					<p className="text-sm">
						No session data available for analytics. Start tracking user sessions to see insights here.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('space-y-6', className)}>
			{/* Dashboard Header */}
			<div className="bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
							<BarChart3 size={28} className="text-blue-600 dark:text-blue-400" />
							Analytics Dashboard
						</h1>
						<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
							Comprehensive insights from user session data
						</p>
					</div>
					<div className="text-right">
						<div className="text-sm text-gray-500 dark:text-gray-400">Data Overview</div>
						<div className="text-lg font-semibold text-gray-900 dark:text-white">
							{quickStats.sessions} session{quickStats.sessions !== 1 ? 's' : ''}
						</div>
						<div className="text-xs text-gray-500 dark:text-gray-400">
							{quickStats.payloads} payload{quickStats.payloads !== 1 ? 's' : ''}
						</div>
					</div>
				</div>
			</div>

			{/* Analytics Sections */}
			<div className="space-y-4">
				{/* Session Analytics */}
				{showSessionAnalytics && (
					<AnalyticsSection
						title="Session Analytics"
						icon={<Activity size={18} className="text-green-600 dark:text-green-400" />}
						defaultExpanded={defaultExpanded}
					>
						<SessionAnalyticsDashboard
							decodedPayloads={activePayloads}
							className="border-0 bg-transparent p-0"
						/>
					</AnalyticsSection>
				)}

				{/* Click Analytics */}
				{showClickAnalytics && (
					<AnalyticsSection
						title="Click Analytics"
						icon={<MousePointer size={18} className="text-blue-600 dark:text-blue-400" />}
						defaultExpanded={defaultExpanded}
					>
						<ClickInsight
							decodedPayloads={activePayloads}
							className="border-0 bg-transparent p-0"
							showElementDetails={true}
						/>
					</AnalyticsSection>
				)}
			</div>
		</div>
	);
};

export default DashboardInsight;
export { DashboardInsight };
export type { DashboardInsightProps };
