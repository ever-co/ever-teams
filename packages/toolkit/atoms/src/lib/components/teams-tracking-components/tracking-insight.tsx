'use client';

import React, { useState, useMemo } from 'react';
import { Data, decode } from 'clarity-decode';
import { cn, Button } from '@ever-teams/toolkit-ui';
import { BarChart3, Loader2, RefreshCw } from 'lucide-react';

import DashboardInsight from './insight/dashboard-insight';
import { useTrackingContext } from '@lib/context/teams-tracking-context';

interface TrackingInsightProps {
	className?: string;
}

const TeamsTrackingInsight: React.FC<TrackingInsightProps> = ({ className }) => {
	const { sessions, loading, error, refetchSessions } = useTrackingContext();

	const [isRefreshing, setIsRefreshing] = useState(false);

	// Decode all session payloads for analytics
	const activePayloads = useMemo(() => {
		if (!sessions?.length) return [];

		const decodedPayloads: Data.DecodedPayload[] = [];

		sessions.forEach((session) => {
			try {
				const sessionDecodedPayloads = session.session.payloads.map((payload) => decode(payload.encodedData));
				decodedPayloads.push(...sessionDecodedPayloads);
			} catch (error) {
				console.warn('Failed to decode session payloads:', error);
			}
		});

		return decodedPayloads;
	}, [sessions]);

	// Manual refresh handler
	const handleManualRefresh = async () => {
		setIsRefreshing(true);
		try {
			await refetchSessions();
		} catch (error) {
			console.error('Manual refresh failed:', error);
		} finally {
			setIsRefreshing(false);
		}
	};

	if (error) {
		return (
			<div
				className={cn(
					'bg-white dark:bg-black rounded-lg border border-red-200 dark:border-red-800 p-8',
					className
				)}
			>
				<div className="text-center text-red-600 dark:text-red-400">
					<BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
					<h3 className="text-lg font-medium mb-2">Analytics Error</h3>
					<p className="text-sm mb-4">{error}</p>
					<Button onClick={handleManualRefresh} variant="outline" size="sm" disabled={isRefreshing}>
						{isRefreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
						Retry
					</Button>
				</div>
			</div>
		);
	}

	if (loading && !sessions?.length) {
		return (
			<div
				className={cn(
					'bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-8',
					className
				)}
			>
				<div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
					<Loader2 size={20} className="animate-spin" />
					<span>Loading insight data...</span>
				</div>
			</div>
		);
	}

	if (!sessions?.length) {
		return (
			<div
				className={cn(
					'bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-8',
					className
				)}
			>
				<div className="text-center text-gray-500 dark:text-gray-400">
					<BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
					<h3 className="text-lg font-medium mb-2">No Insight Data</h3>
					<p className="text-sm">No session data available</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('space-y-6', className)}>
			{/* Analytics Content */}
			<DashboardInsight decodedPayloads={activePayloads} defaultExpanded={true} />
		</div>
	);
};

export default TeamsTrackingInsight;
export { TeamsTrackingInsight };
export type { TrackingInsightProps };
