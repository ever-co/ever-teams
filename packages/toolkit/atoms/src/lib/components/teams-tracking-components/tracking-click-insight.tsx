'use client';

import React, { useMemo } from 'react';
import { Data, decode } from 'clarity-decode';
import { cn } from '@ever-teams/toolkit-ui';
import ClickInsight from './insight/click-insight';
import { useTrackingContext } from '@lib/context/teams-tracking-context';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { SpinOverlayLoader } from '@components/loaders/spin-overlay-loader';

interface TeamsTrackingClickInsightProps {
	className?: string;
}

const TeamsTrackingClickInsight: React.FC<TeamsTrackingClickInsightProps> = ({ className }) => {
	const { sessions, loading, error } = useTrackingContext();

	// Decode all session payloads for analytics
	const activePayloads = useMemo(() => {
		if (!sessions?.length) return [];

		const decodedPayloads: Data.DecodedPayload[] = [];

		sessions.forEach((session) => {
			try {
				const sessionPayloads = session.session.payloads.map((payload) => decode(payload.encodedData));
				decodedPayloads.push(...sessionPayloads);
			} catch (error) {
				console.warn('Failed to decode session payloads:', error);
			}
		});

		return decodedPayloads;
	}, [sessions]);

	return (
		<div
			className={cn(
				'relative bg-white dark:bg-black rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6',
				error && 'border border-red-200',
				className
			)}
		>
			{loading && <SpinOverlayLoader />}
			{/* Analytics Content */}
			<ClickInsight decodedPayloads={activePayloads} />
			{error && (
				<div
					className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800"
					role="alert"
				>
					{error}
				</div>
			)}
			<TeamsTimerFooter />
		</div>
	);
};

export default TeamsTrackingClickInsight;
export { TeamsTrackingClickInsight };
export type { TeamsTrackingClickInsightProps };
