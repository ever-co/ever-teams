export default function CircularProgress({
	radius = 24,
	cx = 24,
	cy = 24,
	percentage = 55
}: {
	radius?: number;
	cx?: number;
	cy?: number;
	percentage: number;
}) {
	const circumference = radius * 2 * Math.PI;

	return (
		<>
			<div
				x-data="scrollProgress"
				className="inline-flex overflow-hidden relative justify-center items-center w-12 h-12 max-h-12 rounded-full -rotate-90 max-w-12 min-w-12"
			>
				<svg className="w-12 h-12">
					<circle
						className="text-gray-300"
						strokeWidth="8"
						stroke="currentColor"
						fill="none"
						r={radius}
						cx={cx}
						cy={cy}
					/>
					<circle
						className="text-[#27AE60]"
						strokeWidth="8"
						strokeDasharray={circumference}
						strokeDashoffset={`calc(${circumference} - ${(percentage / 100) * circumference})`}
						strokeLinecap="round"
						stroke="currentColor"
						fill="none"
						r={radius}
						cx={cx}
						cy={cy}
					/>
				</svg>
				<span
					className="absolute text-xs font-normal text-black rotate-90 dark:text-white"
					x-text={`${percentage}%`}
				>
					{percentage}%{' '}
				</span>
			</div>
		</>
	);
}
