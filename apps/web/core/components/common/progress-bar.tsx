export function ProgressBar({ width, progress }: { width: number | string; progress: number | string }) {
	return (
		<div className="flex relative" style={{ width }}>
			<div className="bg-success h-2 rounded-full absolute z-[1]" style={{ width: progress }}></div>
			<div className="bg-foreground/10 w-full h-2 rounded-full absolute z-[0]" />
		</div>
	);
}
