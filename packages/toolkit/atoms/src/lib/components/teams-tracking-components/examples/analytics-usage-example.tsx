/**
 * Analytics Usage Examples
 *
 * This file demonstrates different ways to use the new Clarity Analytics components
 * with various configuration options and integration patterns.
 */

import React from 'react';
import { Data } from 'clarity-decode';
import SessionInsight from '../insight/session-insight';
import TrackingAnalytics from '../tracking-insight';
import ClickInsight from '../insight/click-insight';
import AnalyticsDashboard from '../insight/dashboard-insight';

// Example 1: Basic Session Analytics
export const BasicSessionAnalyticsExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Session Analytics Example</h2>
			<SessionInsight decodedPayloads={decodedPayloads} />
		</div>
	);
};

// Example 2: Basic Click Analytics
export const BasicClickAnalyticsExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Click Analytics Example</h2>
			<ClickInsight decodedPayloads={decodedPayloads} showElementDetails={true} />
		</div>
	);
};

// Example 3: Combined Analytics Dashboard
export const CombinedAnalyticsDashboardExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Combined Analytics Dashboard</h2>
			<AnalyticsDashboard
				decodedPayloads={decodedPayloads}
				defaultExpanded={true}
				showSessionAnalytics={true}
				showClickAnalytics={true}
			/>
		</div>
	);
};

// Example 4: Compact Analytics Dashboard
export const CompactAnalyticsDashboardExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Compact Analytics Dashboard</h2>
			<AnalyticsDashboard
				decodedPayloads={decodedPayloads}
				defaultExpanded={false}
				showSessionAnalytics={true}
				showClickAnalytics={true}
				className="max-w-4xl"
			/>
		</div>
	);
};

// Example 5: Session Analytics Only
export const SessionOnlyAnalyticsExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Session Analytics Only</h2>
			<AnalyticsDashboard
				decodedPayloads={decodedPayloads}
				showSessionAnalytics={true}
				showClickAnalytics={false}
			/>
		</div>
	);
};

// Example 6: Click Analytics Only
export const ClickOnlyAnalyticsExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Click Analytics Only</h2>
			<AnalyticsDashboard
				decodedPayloads={decodedPayloads}
				showSessionAnalytics={false}
				showClickAnalytics={true}
			/>
		</div>
	);
};

// Example 7: Full Tracking Analytics with Auto-refresh
export const FullTrackingAnalyticsExample: React.FC = () => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Full Tracking Analytics with Auto-refresh</h2>
			<TrackingAnalytics />
		</div>
	);
};

// Example 8: Tracking Analytics with Individual Component Views
export const IndividualComponentTrackingExample: React.FC = () => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Tracking Analytics with Component Switching</h2>
			<TrackingAnalytics />
		</div>
	);
};

// Example 9: Side-by-Side Analytics Comparison
export const SideBySideAnalyticsExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Side-by-Side Analytics Comparison</h2>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="space-y-4">
					<h3 className="text-lg font-medium">Session Metrics</h3>
					<SessionInsight decodedPayloads={decodedPayloads} />
				</div>
				<div className="space-y-4">
					<h3 className="text-lg font-medium">Click Metrics</h3>
					<ClickInsight decodedPayloads={decodedPayloads} showElementDetails={true} />
				</div>
			</div>
		</div>
	);
};

// Example 10: Analytics with Custom Styling
export const StyledAnalyticsExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({ decodedPayloads }) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Analytics with Custom Styling</h2>
			<div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-xl">
				<AnalyticsDashboard decodedPayloads={decodedPayloads} className="shadow-xl" defaultExpanded={true} />
			</div>
		</div>
	);
};

// Example 11: Minimal Click Analytics (No Element Details)
export const MinimalClickAnalyticsExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Minimal Click Analytics</h2>
			<ClickInsight decodedPayloads={decodedPayloads} showElementDetails={false} className="max-w-2xl" />
		</div>
	);
};

// Example 12: Error Handling Example
export const ErrorHandlingAnalyticsExample: React.FC = () => {
	// Simulate empty/invalid data
	const emptyPayloads: Data.DecodedPayload[] = [];

	return (
		<div className="w-full space-y-6">
			<h2 className="text-xl font-semibold">Error Handling Example</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h3 className="text-lg font-medium mb-4">Empty Session Data</h3>
					<SessionInsight decodedPayloads={emptyPayloads} />
				</div>
				<div>
					<h3 className="text-lg font-medium mb-4">Empty Click Data</h3>
					<ClickInsight decodedPayloads={emptyPayloads} />
				</div>
			</div>
		</div>
	);
};

// Export all examples for easy access
export const AnalyticsExamples = {
	BasicSessionAnalyticsExample,
	BasicClickAnalyticsExample,
	CombinedAnalyticsDashboardExample,
	CompactAnalyticsDashboardExample,
	SessionOnlyAnalyticsExample,
	ClickOnlyAnalyticsExample,
	FullTrackingAnalyticsExample,
	IndividualComponentTrackingExample,
	SideBySideAnalyticsExample,
	StyledAnalyticsExample,
	MinimalClickAnalyticsExample,
	ErrorHandlingAnalyticsExample
};
