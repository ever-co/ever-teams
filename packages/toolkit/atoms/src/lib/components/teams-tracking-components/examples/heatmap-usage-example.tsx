/**
 * ClarityHeatmap Usage Examples
 *
 * This file demonstrates different ways to use the ClarityHeatmap component
 * with various configuration options and use cases.
 */

import React from 'react';
import { Data } from 'clarity-decode';
import ClarityHeatmap, { ClarityHeatmapProps } from '../clarity/clarity-heatmap';

// Example 1: Basic Usage
export const BasicHeatmapExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({ decodedPayloads }) => {
	return (
		<div className="w-full h-[600px]">
			<ClarityHeatmap decodedPayloads={decodedPayloads} />
		</div>
	);
};

// Example 2: Customized Heatmap with Different Color Scheme
export const CoolHeatmapExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({ decodedPayloads }) => {
	return (
		<div className="w-full h-[600px]">
			<ClarityHeatmap
				decodedPayloads={decodedPayloads}
				colorScheme="cool"
				aggregationRadius={20}
				showCounts={false}
				className="custom-heatmap"
			/>
		</div>
	);
};

// Example 3: High-Precision Heatmap (smaller aggregation radius)
export const HighPrecisionHeatmapExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({
	decodedPayloads
}) => {
	return (
		<div className="w-full h-[600px]">
			<ClarityHeatmap
				decodedPayloads={decodedPayloads}
				colorScheme="blue"
				aggregationRadius={5} // Very precise clustering
				showCounts={true}
			/>
		</div>
	);
};

// Example 4: Multiple Heatmap Comparison
export const HeatmapComparisonExample: React.FC<{
	sessionA: Data.DecodedPayload[];
	sessionB: Data.DecodedPayload[];
}> = ({ sessionA, sessionB }) => {
	return (
		<div className="flex gap-5 h-[600px]">
			<div className="flex-1 space-y-3">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session A</h3>
				<div className="h-full">
					<ClarityHeatmap decodedPayloads={sessionA} colorScheme="hot" aggregationRadius={15} />
				</div>
			</div>
			<div className="flex-1 space-y-3">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session B</h3>
				<div className="h-full">
					<ClarityHeatmap decodedPayloads={sessionB} colorScheme="cool" aggregationRadius={15} />
				</div>
			</div>
		</div>
	);
};

// Example 5: Heatmap with Custom Styling
export const StyledHeatmapExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({ decodedPayloads }) => {
	return (
		<div className="w-full h-[600px] border-2 border-slate-200 rounded-xl shadow-xl overflow-hidden">
			<ClarityHeatmap
				decodedPayloads={decodedPayloads}
				colorScheme="hot"
				aggregationRadius={12}
				showCounts={true}
			/>
		</div>
	);
};

// Example 6: Responsive Heatmap Container
export const ResponsiveHeatmapExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({ decodedPayloads }) => {
	return (
		<div className="w-full h-[80vh] min-h-[400px] max-h-[800px] resize overflow-hidden border border-gray-300 rounded-lg">
			<ClarityHeatmap
				decodedPayloads={decodedPayloads}
				aggregationRadius={10}
				showCounts={true}
				colorScheme="hot"
			/>
		</div>
	);
};

// Example 7: Heatmap Configuration Options
export const heatmapConfigurations: ClarityHeatmapProps[] = [
	{
		decodedPayloads: [], // Would be populated with actual data
		colorScheme: 'hot',
		aggregationRadius: 10,
		showCounts: true
	},
	{
		decodedPayloads: [],
		colorScheme: 'cool',
		aggregationRadius: 15,
		showCounts: false
	},
	{
		decodedPayloads: [],
		colorScheme: 'blue',
		aggregationRadius: 20,
		showCounts: true
	}
];

// Example 8: Integration with State Management
export const StatefulHeatmapExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({ decodedPayloads }) => {
	const [colorScheme, setColorScheme] = React.useState<'hot' | 'cool' | 'blue'>('hot');
	const [aggregationRadius, setAggregationRadius] = React.useState(15);
	const [showCounts, setShowCounts] = React.useState(true);

	return (
		<div className="space-y-5">
			{/* Controls */}
			<div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
				<div className="flex flex-wrap items-center gap-4 sm:gap-6">
					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Scheme:</label>
						<select
							value={colorScheme}
							onChange={(e) => {
								const value = e.target.value;
								if (value === 'hot' || value === 'cool' || value === 'blue') {
									setColorScheme(value);
								}
							}}
							className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="hot">Hot (Red-Yellow)</option>
							<option value="cool">Cool (Blue-Cyan)</option>
							<option value="blue">Blue</option>
						</select>
					</div>

					<div className="flex items-center gap-2">
						<label className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Aggregation Radius:
						</label>
						<input
							type="range"
							min="5"
							max="30"
							value={aggregationRadius}
							onChange={(e) => setAggregationRadius(Number(e.target.value))}
							className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 slider"
						/>
						<span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[40px]">
							{aggregationRadius}px
						</span>
					</div>

					<div className="flex items-center gap-2">
						<input
							type="checkbox"
							id="show-count"
							checked={showCounts}
							onChange={(e) => setShowCounts(e.target.checked)}
							className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
						/>
						<label htmlFor="show-count" className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Show Click Counts
						</label>
					</div>
				</div>
			</div>

			{/* Heatmap */}
			<div className="w-full h-[600px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
				<ClarityHeatmap
					decodedPayloads={decodedPayloads}
					colorScheme={colorScheme}
					aggregationRadius={aggregationRadius}
					showCounts={showCounts}
				/>
			</div>
		</div>
	);
};

// Example 9: Error Handling Wrapper
export const SafeHeatmapExample: React.FC<{ decodedPayloads: Data.DecodedPayload[] }> = ({ decodedPayloads }) => {
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		setError(null);

		if (!decodedPayloads || decodedPayloads.length === 0) {
			setError('No session data provided');
			return;
		}

		// Validate payloads have required structure
		const hasValidPayloads = decodedPayloads.some((payload) => payload.envelope && payload.envelope.sessionId);

		if (!hasValidPayloads) {
			setError('Invalid session data format');
			return;
		}
	}, [decodedPayloads]);

	if (error) {
		return (
			<div className="p-5 text-center text-gray-600 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800">
				<div className="text-lg">⚠️ {error}</div>
			</div>
		);
	}

	return (
		<div className="w-full h-[600px]">
			<ClarityHeatmap decodedPayloads={decodedPayloads} />
		</div>
	);
};
