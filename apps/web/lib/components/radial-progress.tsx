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
				className="relative -rotate-90 inline-flex items-center justify-center overflow-hidden rounded-full"
			>
				<svg className="w-12 h-12">
					<circle
						className="text-gray-300"
						strokeWidth="8"
						stroke="currentColor"
						fill="transparent"
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
						fill="transparent"
						r={radius}
						cx={cx}
						cy={cy}
					/>
				</svg>
				<span
					className="absolute text-xs font-normal text-black dark:text-white rotate-90"
					x-text={`${percentage}%`}
				>
					{percentage}%
				</span>
			</div>
		</>
	);
}
