'use client';

import {
	TeamsTrackingClickInsight,
	TeamsTrackingFilter,
	TeamsTrackingHeatmap,
	TeamsTrackingSessionInsight,
	TeamsTrackingSessionReplay
} from '@ever-teams/atoms';

export default function ReplayPage() {
	return (
		<div className="w-full h-full">
			<TeamsTrackingFilter />
			<TeamsTrackingClickInsight className="mb-4" />
			<TeamsTrackingSessionInsight className="mb-4" />
			<TeamsTrackingSessionReplay className="mb-4" />
			<TeamsTrackingHeatmap />
		</div>
	);
}
