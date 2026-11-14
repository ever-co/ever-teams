import React, { type FC } from 'react';

interface IconProps {
	className?: string;
}

const stroke = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 2,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const
};

export const PlayIcon: FC<IconProps> = ({ className }) => (
	<svg className={className} viewBox="0 0 24 24" aria-hidden="true">
		<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" fill="currentColor" />
	</svg>
);

export const StopIcon: FC<IconProps> = ({ className }) => (
	<svg className={className} viewBox="0 0 24 24" aria-hidden="true">
		<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" />
	</svg>
);

export const SearchIcon: FC<IconProps> = ({ className }) => (
	<svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
		<circle cx="11" cy="11" r="6.5" />
		<path d="m20 20-3.9-3.9" />
	</svg>
);

// The whole icon turns: a transform on a <path> turns around the SVG's own origin, not the arc's centre
export const SpinnerIcon: FC<IconProps> = ({ className }) => (
	<svg className={`animate-spin ${className ?? ''}`.trim()} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
		<path d="M12 3a9 9 0 1 0 9 9" />
	</svg>
);

export const ClockIcon: FC<IconProps> = ({ className }) => (
	<svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
		<circle cx="12" cy="12" r="8.5" />
		<path d="M12 7.5V12l3 2" />
	</svg>
);
