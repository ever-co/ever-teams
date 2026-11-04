interface TrackedHoursCellProps {
	duration: number;
	formatDuration: (duration: number) => string;
}

export function TrackedHoursCell({ duration, formatDuration }: TrackedHoursCellProps) {
	return (
		<div className="inline-flex items-center gap-2">
			<div className="size-2 shrink-0 rounded-full bg-success"></div>
			<span className="font-medium tabular-nums text-foreground">{formatDuration(duration)}</span>
		</div>
	);
}
