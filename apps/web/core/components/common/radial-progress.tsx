export default function RadialProgress({
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
				x-data="{ scrollProgress: 0 }"
				className="inline-flex overflow-hidden relative justify-center items-center rounded-full -rotate-90"
			>
				<svg className="w-12 h-12">
					<circle
						className="text-foreground/10"
						strokeWidth="8"
						stroke="currentColor"
						fill="none"
						r={radius}
						cx={cx}
						cy={cy}
					/>
					<circle
						className="text-success"
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
					className="absolute text-xs font-normal tabular-nums text-foreground rotate-90"
					x-text={`${percentage}%`}
				>
					{percentage}%
				</span>
			</div>
		</>
	);
}
