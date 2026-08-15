import React from 'react';

interface ITeamsReportDisplayerLoaderProps {
	showProgress?: boolean;
	className?: string;
}

/**
 * A skeleton loader component that mimics the TeamsReportDisplayer component.
 * Supports both light and dark mode.
 * @param {ITeamsReportDisplayerLoaderProps} props
 * @param {boolean} [props.showProgress=true] Whether to show a progress bar skeleton
 * @param {string} [props.className] Additional CSS classes
 * @returns {React.JSX.Element} The skeleton loader component
 */
const TeamsDisplayerLoader: React.FC<ITeamsReportDisplayerLoaderProps> = ({ showProgress = true }) => {
	return (
		<>
			{/* Time display skeleton */}
			<div className="h-7 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />

			{/* Progress bar skeleton */}
			{showProgress && <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />}
		</>
	);
};

TeamsDisplayerLoader.displayName = 'TeamsDisplayerLoader';

export { TeamsDisplayerLoader };
