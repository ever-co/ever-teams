/** @jsxImportSource theme-ui */
import { ReactElement, useId, useMemo } from 'react';
import { cn } from '@ever-teams/toolkit-ui';

/**
 * Interface for the properties of the ProgressCircle component.
 * @export
 * @interface ProgressCircleProps
 */
export interface ProgressCircleProps {
	/**
	 * The progress value (0-100).
	 * @type {number}
	 */
	value?: number;

	/**
	 * The radius of the progress circle.
	 * @type {number}
	 */
	radius?: number;

	/**
	 * The width of the circle's stroke (line thickness).
	 * @type {number}
	 */
	strokeWidth?: number;

	/**
	 * The duration of the animation in milliseconds.
	 * @type {number}
	 */
	duration?: number;

	/**
	 * The main color from theme (can be a solid color or CSS gradient).
	 * @type {string}
	 */
	color?: string;

	/**
	 * Additional CSS classes.
	 * @type {string}
	 */
	className?: string;
}

/**
 * Parse a CSS linear-gradient string and extract color stops.
 * Returns an array of { offset: string, color: string } for SVG gradient stops.
 */
function parseGradient(gradientString: string): { offset: string; color: string }[] | null {
	const gradientMatch = gradientString.match(/linear-gradient\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)/i);
	if (!gradientMatch) return null;

	const colorStopsString = gradientMatch[2];
	const colorStopPattern = /([a-zA-Z#][a-zA-Z0-9#(),.\s]*?)\s+(\d+%)/g;
	const stops: { offset: string; color: string }[] = [];
	let match;

	while ((match = colorStopPattern.exec(colorStopsString)) !== null) {
		stops.push({
			color: match[1].trim(),
			offset: match[2]
		});
	}

	return stops.length > 0 ? stops : null;
}

/**
 * Check if a string is a CSS gradient.
 */
function isGradient(color: string): boolean {
	return color.includes('linear-gradient') || color.includes('radial-gradient');
}

export function ProgressCircle({
	value = 0,
	radius = 45,
	strokeWidth = 10,
	duration = 500,
	color,
	className
}: ProgressCircleProps): ReactElement {
	// Generate unique ID for gradient to avoid conflicts with multiple instances
	const gradientId = useId();

	// Calculate the exact size needed for the circle (diameter + stroke width on both sides)
	const size = (radius + strokeWidth) * 2;
	const center = size / 2;

	// Calculate the circumference of the circle based on the radius
	const circumference = 2 * Math.PI * radius;

	// Calculate the stroke offset based on the value (0-100)
	const clampedValue = Math.min(100, Math.max(0, value));
	const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

	// Parse mainColor to get gradient stops for SVG
	const gradientStops = useMemo(() => {
		if (!color) return null;
		if (isGradient(color)) {
			return parseGradient(color);
		}
		return null;
	}, [color]);

	// Determine if we should use gradient or solid color
	const useGradient = gradientStops && gradientStops.length > 0;

	const solidColor = color && !isGradient(color) ? color : undefined;

	return (
		<div className={cn(`relative inline-block`, className)} style={{ width: size, height: size }}>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				className="transform -rotate-90"
				aria-label="progress"
			>
				<defs>
					{/* Define a linear gradient for the progress stroke */}
					<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
						{useGradient ? (
							gradientStops.map((stop, index) => (
								<stop key={index} offset={stop.offset} stopColor={stop.color} />
							))
						) : (
							<>
								<stop offset="0%" stopColor={solidColor} />
								<stop offset="100%" stopColor={solidColor} />
							</>
						)}
					</linearGradient>
				</defs>
				{/* Render the background circle */}
				<circle
					cx={center}
					cy={center}
					r={radius}
					strokeWidth={strokeWidth}
					fill="transparent"
					className="stroke-[hsl(var(--muted))] dark:stroke-[hsl(var(--muted))]"
				/>
				{/* Render the foreground circle representing the progress */}
				<circle
					cx={center}
					cy={center}
					r={radius}
					strokeWidth={strokeWidth}
					fill="transparent"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					stroke={`url(#${gradientId})`}
					strokeLinecap="round"
					className="transition-all"
					style={{ transitionDuration: `${duration}ms` }}
				/>
			</svg>
			{/* Display the percentage inside the circle */}
			<div className="absolute inset-0 flex items-center justify-center text-xl font-semibold">
				{Math.round(clampedValue)}%
			</div>
		</div>
	);
}
