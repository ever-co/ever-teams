export function ProgressBar({
	width,
	progress,
}: {
	width: number | string;
	progress: number | string;
}) {
	return (
		<div className="flex relative" style={{ width }}>
			<div
				className="bg-[#28D581] h-[8px] rounded-full absolute z-20"
				style={{ width: progress }}
			></div>
			<div className="bg-[#E8EBF8] dark:bg-[#18181B] w-full h-[8px] rounded-full absolute z-10" />
		</div>
	);
}
