export const GridLayout = ({ cols = 2, rows = 2, gap = 0 }: { cols: number; rows: number; gap: number }) => {
	const array = Array.from({ length: cols * rows }).map((_, i) => i);
	return (
		<div
			style={{
				gridTemplateColumns: `repeat(${cols}, 1fr)`,
				gridTemplateRows: `repeat(${rows}, 1fr)`,
				gap: gap
			}}
			className="grid flex-grow p-1 border justify-between"
		>
			{array.map((item, index) => (
				<div key={index}></div>
			))}
		</div>
	);
};
