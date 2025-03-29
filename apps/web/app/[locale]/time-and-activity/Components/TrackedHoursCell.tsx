interface TrackedHoursCellProps {
	duration: number;
	formatDuration: (duration: number) => string;
}

export function TrackedHoursCell({ duration, formatDuration }: TrackedHoursCellProps) {
	return (
		<div className="flex items-center gap-2">
			<div className="w-2.5 h-2.5 rounded-full bg-success-light"></div>
			<span className="text-gray-900 dark:text-gray-100 font-medium">
				{formatDuration(duration)}
			</span>
		</div>
	);
}
